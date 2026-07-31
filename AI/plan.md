# MINI-LMS — MASTER SPEC (Tài liệu đặc tả hoàn chỉnh cho AI Agent)

> **Phiên bản:** 1.0 · **Ngày:** 2026-07-07
> **Mục đích tài liệu:** Đây là nguồn sự thật duy nhất (single source of truth) của dự án Mini-LMS. Tài liệu được viết để một AI coding agent (Claude Code, Gemini CLI) có thể đọc và **tự build toàn bộ hệ thống từ đầu đến cuối** theo 4 phase, đồng thời con người đọc để review.

---

## PHẦN 0 — QUY TẮC THỰC THI DÀNH CHO AI AGENT

Khi bạn (AI agent) được giao build dự án này, hãy tuân thủ các quy tắc sau:

1. **Đọc trước khi code:** Đọc toàn bộ Phần 1–4 (ràng buộc, stack, kiến trúc, schema) trước khi viết bất kỳ dòng code nào. Mỗi phase chỉ code trong phạm vi Phần 10 quy định.
2. **Không tự ý đổi stack:** Tech stack ở Phần 2 là quyết định cố định. Không thay Prisma bằng TypeORM, không thay BullMQ bằng giải pháp khác, không thêm thư viện lớn ngoài danh sách nếu chưa hỏi người dùng.
3. **Schema là hợp đồng:** Mọi thay đổi database phải qua Prisma migration và phải khớp Phần 4. Nếu phát hiện schema thiếu trường, đề xuất trước — không tự thêm âm thầm.
4. **Build theo phase, có kiểm chứng:** Kết thúc mỗi phase, chạy toàn bộ mục "Definition of Done" của phase đó (Phần 10). Không sang phase sau khi phase trước chưa pass.
5. **Chi phí là ràng buộc cứng:** Mọi tính năng gọi AI phải đi qua `AiService` tập trung (Phần 7) — có rate limit, có ghi log token, có fallback. Không gọi Gemini API rải rác ở nhiều nơi.
6. **Xử lý tiếng Việt đúng cách:** Mọi so sánh chuỗi (chấm exact match, search) phải chuẩn hóa Unicode NFC. Xem Phần 9.2.
7. **Hỏi khi mơ hồ:** Nếu yêu cầu trong spec mâu thuẫn hoặc thiếu, dừng lại hỏi người dùng thay vì tự suy diễn.
8. **Conventions:** TypeScript `strict: true` toàn bộ; ESLint + Prettier; commit theo từng task nhỏ với message tiếng Anh dạng `feat(scope): ...`; mỗi module backend có ít nhất unit test cho logic nghiệp vụ (đặc biệt: hàm chuẩn hóa chuỗi, hàm chấm điểm, parse kết quả AI).

---

## PHẦN 1 — TỔNG QUAN & RÀNG BUỘC

### 1.1. Bài toán

Xây dựng nền tảng học tập thông minh (Mini-LMS) cho phép:

- Giáo viên quản lý **Khóa học** (kho câu hỏi) và **Nhóm học tập** (lớp).
- Học sinh **luyện tập đa chế độ** (flashcard, trắc nghiệm, tự luận).
- **Tự động tạo đề thi bằng AI** từ dữ liệu khóa học.
- **Chấm tự luận linh hoạt**: chấm cứng bằng code (0 đồng) hoặc chấm mềm bằng AI (hiểu ngữ nghĩa).

### 1.2. Ràng buộc vận hành (KHÔNG THƯƠNG LƯỢNG)

| Ràng buộc | Giá trị |
|---|---|
| Quy mô giai đoạn 1 | ~20 học sinh, 1–3 giáo viên |
| Ngân sách vận hành | ~20.000 VNĐ/học sinh/tháng → **tổng ≤ 400.000 VNĐ/tháng** (bao gồm cả VPS + API AI) |
| Chi phí AI mục tiêu | ≤ 100.000 VNĐ/tháng (phần còn lại cho hạ tầng) |
| Nguyên tắc vàng | Cái gì code thuần làm được thì **không** gọi AI. AI chỉ dùng cho 2 việc: chấm tự luận tương đối & sinh đề mới |
| Đề AI sinh ra | Lưu cố định vào DB (`test_questions`), 20 học sinh làm bài chỉ đọc từ DB, **không** gọi lại AI |
| Ngôn ngữ giao diện | Tiếng Việt |

### 1.3. Vai trò người dùng (Roles)

| Role | Quyền |
|---|---|
| `ADMIN` | Toàn quyền: quản lý user, xem dashboard chi phí AI, mọi quyền của teacher |
| `TEACHER` | CRUD khóa học/câu hỏi/nhóm của mình, tạo đề (thủ công + AI), xem kết quả học sinh, chấm lại tay các câu AI chấm lỗi |
| `STUDENT` | Tham gia nhóm, luyện tập các khóa học được gán, làm bài kiểm tra, xem kết quả của mình |

> ⚠️ **Khác bản kế hoạch cũ:** bản cũ chỉ có role `admin/student` nhưng toàn bộ nghiệp vụ xoay quanh "Giáo viên". Spec này bổ sung role `TEACHER` tách khỏi `ADMIN`.

---

## PHẦN 2 — TECH STACK (QUYẾT ĐỊNH CỐ ĐỊNH)

| Layer | Công nghệ | Ghi chú / Lý do |
|---|---|---|
| Frontend | **Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui** | SSR cho trang public, CSR cho phòng thi. shadcn/ui để dựng UI nhanh, đồng bộ |
| Backend | **NestJS 11 + TypeScript** | Kiến trúc module rõ ràng, dễ cho AI agent điều hướng |
| ORM | **Prisma** | Schema declarative, migration an toàn, sinh type tự động |
| Database | **PostgreSQL 16** | Kèm extension `pg_trgm` + `unaccent` cho search tiếng Việt |
| Cache / Queue / Rate limit | **Redis 7 + BullMQ** | Queue chấm AI bất đồng bộ; rate limit theo ngày; cache session |
| AI Provider | **Google Gemini API** — model `gemini-2.5-flash-lite` (mặc định), `gemini-2.5-flash` (dự phòng chất lượng) | Rẻ nhất thị trường, hỗ trợ **structured output (responseSchema)** và **implicit context caching** |
| Object Storage | **MinIO** (dev, chạy trong docker-compose) / **AWS S3** (prod, tùy chọn) | MVP chỉ dùng cho avatar + ảnh minh họa câu hỏi (tùy chọn, Phase 4) |
| Auth | **JWT tự quản** (access 15 phút + refresh 7 ngày, refresh lưu Redis) · **Google Sign-In qua Firebase Auth** (tùy chọn, Phase 4: FE lấy Firebase ID token → BE verify bằng `firebase-admin` → phát JWT nội bộ) | |
| Search | **MVP:** PostgreSQL `ILIKE` + `unaccent` + index GIN `pg_trgm` · **Post-MVP:** ElasticSearch | Với vài trăm bản ghi, Postgres quá đủ; chừa sẵn interface `SearchService` để swap ES sau |
| Hạ tầng | **Docker Compose** (1 VPS duy nhất chạy tất cả) | VPS 1–2GB RAM (~100–150k VNĐ/tháng) là đủ cho 20 học sinh |
| Package manager | **pnpm workspaces** (monorepo) | |
| Validation | DTO backend: `class-validator` (chuẩn NestJS) · Parse output AI + shared types: `zod` (đặt trong `packages/shared`) | |

### 2.1. Các quyết định "KHÔNG làm" ở MVP (chống over-engineering)

- ❌ Không microservices — 1 app NestJS duy nhất (worker BullMQ chạy chung process).
- ❌ Không ElasticSearch, không Kafka, không Kubernetes.
- ❌ Không realtime WebSocket cho phòng thi — dùng polling 3 giây khi chờ chấm AI.
- ❌ Không multi-attempt — mỗi học sinh làm mỗi đề đúng 1 lần (unique constraint).
- ❌ Không upload file trong câu hỏi ở Phase 1–3 (text thuần).

---
## PHẦN 3 — KIẾN TRÚC HỆ THỐNG & CẤU TRÚC REPO

### 3.1. Sơ đồ tổng thể

```
[Browser]
   │  HTTPS
   ▼
[Next.js (apps/web)] ──REST/JSON──► [NestJS API (apps/api)]
                                        │
                          ┌─────────────┼──────────────┬─────────────┐
                          ▼             ▼              ▼             ▼
                    [PostgreSQL]     [Redis]      [Gemini API]  [MinIO/S3]
                                   (BullMQ queue,  (chấm AI,     (avatar/ảnh,
                                    rate limit,     sinh đề)      tùy chọn)
                                    refresh token)
```

### 3.2. Cấu trúc monorepo

```
mini-lms/
├── docker-compose.yml          # postgres, redis, minio, api, web
├── pnpm-workspace.yaml
├── .env.example
├── apps/
│   ├── web/                    # Next.js 15 App Router
│   │   └── src/
│   │       ├── app/            # routes (xem Phần 8)
│   │       ├── components/     # shadcn/ui + components nghiệp vụ
│   │       ├── lib/            # api client (fetch wrapper + JWT refresh)
│   │       └── hooks/
│   └── api/                    # NestJS
│       └── src/
│           ├── modules/
│           │   ├── auth/          # JWT, guards, RBAC decorator @Roles()
│           │   ├── users/
│           │   ├── groups/        # kèm group-members, group-courses
│           │   ├── courses/
│           │   ├── questions/
│           │   ├── search/
│           │   ├── tests/         # tạo đề thủ công + AI
│           │   ├── submissions/   # phòng thi, nộp bài
│           │   ├── grading/       # chấm exact + worker BullMQ chấm AI
│           │   ├── ai/            # AiService: cổng duy nhất gọi Gemini
│           │   └── stats/         # dashboard chi phí AI (admin)
│           ├── common/            # filters, interceptors, pipes
│           └── prisma/            # schema.prisma + migrations + seed.ts
└── packages/
    └── shared/                 # zod schemas + types dùng chung FE/BE
```

### 3.3. Luồng nghiệp vụ quan trọng nhất: Nộp bài & chấm điểm

```
Học sinh bấm "Nộp bài"
  → POST /submissions/:id/submit
  → [SYNC - 0 đồng]  Chấm ngay: MCQ (so key) + Essay EXACT (chuẩn hóa chuỗi rồi so)
  → Nếu đề KHÔNG có câu essay AI  → status = GRADED, trả điểm luôn
  → Nếu CÓ câu essay AI:
       status = GRADING, trả về điểm tạm thời
       enqueue BullMQ job "grade-ai" { submissionId }
       [WORKER] Gom TOÀN BỘ câu AI của bài đó → 1 lần gọi Gemini duy nhất (batch)
                → zod validate JSON trả về
                → cập nhật từng SubmissionAnswer + tính tổng điểm → status = GRADED
                → thất bại sau 2 retry → status = GRADING_FAILED,
                  các câu AI đánh dấu gradedBy = PENDING để giáo viên chấm tay
  → FE poll GET /submissions/:id mỗi 3s khi status = GRADING
```

---

## PHẦN 4 — DATABASE SCHEMA (PRISMA)

### 4.1. Thay đổi so với bản kế hoạch cũ (BẮT BUỘC đọc)

| # | Bản cũ | Spec mới | Lý do |
|---|---|---|---|
| 1 | Role chỉ có `admin/student` | Thêm `TEACHER` | Toàn bộ nghiệp vụ cần phân biệt giáo viên |
| 2 | Không có bảng thành viên nhóm | Thêm `GroupMember` | Không có nó thì không biết học sinh nào thuộc nhóm nào → không phân quyền làm bài được |
| 3 | `Course.group_id` (1 khóa thuộc 1 nhóm) | Bảng nối `GroupCourse` (N-N) | Yêu cầu gốc: "gán **nhiều** khóa học vào một nhóm"; và 1 khóa nên tái sử dụng được cho nhiều nhóm |
| 4 | `Submissions.details` là 1 cục JSON | Tách bảng `SubmissionAnswer` | Cần update từng câu khi AI chấm xong / giáo viên chấm tay từng câu; JSON blob không query & update an toàn được |
| 5 | Không có | Thêm `AiUsageLog` | Ràng buộc chi phí là yêu cầu cứng → phải đo được từng call |

### 4.2. Schema đầy đủ (`apps/api/src/prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role            { ADMIN TEACHER STUDENT }
enum AuthProvider    { LOCAL GOOGLE }
enum QuestionType    { FLASHCARD MCQ ESSAY }
enum GradingType     { EXACT AI }            // chỉ áp dụng cho ESSAY
enum TestSourceType  { COURSE GROUP }
enum TestStatus      { DRAFT PUBLISHED CLOSED }
enum SubmissionStatus{ IN_PROGRESS SUBMITTED GRADING GRADED GRADING_FAILED }
enum GradedBy        { AUTO AI TEACHER PENDING }
enum AiPurpose       { GRADING GENERATION }

model User {
  id           String       @id @default(uuid())
  email        String       @unique
  passwordHash String?                          // null nếu đăng nhập Google
  name         String
  role         Role         @default(STUDENT)
  authProvider AuthProvider @default(LOCAL)
  avatarUrl    String?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  groupsCreated  Group[]        @relation("GroupCreator")
  coursesCreated Course[]       @relation("CourseCreator")
  memberships    GroupMember[]
  testsCreated   Test[]
  submissions    Submission[]
}

model Group {
  id          String   @id @default(uuid())
  name        String
  description String?
  isPublic    Boolean  @default(true)          // true → xuất hiện trong search
  createdById String
  createdBy   User     @relation("GroupCreator", fields: [createdById], references: [id])
  createdAt   DateTime @default(now())

  members      GroupMember[]
  groupCourses GroupCourse[]
}

model GroupMember {
  id       String   @id @default(uuid())
  groupId  String
  userId   String
  joinedAt DateTime @default(now())
  group    Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId])
}

model Course {
  id          String   @id @default(uuid())
  name        String
  description String?
  isPublic    Boolean  @default(true)
  createdById String
  createdBy   User     @relation("CourseCreator", fields: [createdById], references: [id])
  createdAt   DateTime @default(now())

  questions    Question[]
  groupCourses GroupCourse[]
}

model GroupCourse {
  groupId    String
  courseId   String
  assignedAt DateTime @default(now())
  group      Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  course     Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@id([groupId, courseId])
}

model Question {
  id            String        @id @default(uuid())
  courseId      String
  course        Course        @relation(fields: [courseId], references: [id], onDelete: Cascade)
  type          QuestionType
  gradingType   GradingType?                 // bắt buộc khi type = ESSAY, null với loại khác
  questionText  String                       // FLASHCARD: mặt trước
  correctAnswer String                       // FLASHCARD: mặt sau · MCQ: đáp án đúng · ESSAY: đáp án mẫu
  wrongAnswers  Json?                        // MCQ: mảng đúng 3 chuỗi đáp án nhiễu ["..","..",".."]
  explanation   String?                      // FLASHCARD: ví dụ/ghi chú thêm ở mặt sau
  position      Int           @default(0)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model Test {
  id            String         @id @default(uuid())
  title         String
  sourceType    TestSourceType
  sourceId      String                       // id của Course hoặc Group (kiểm tra ở tầng service)
  durationMin   Int                          // thời gian làm bài (phút)
  isAiGenerated Boolean        @default(false)
  status        TestStatus     @default(DRAFT)
  createdById   String
  createdBy     User           @relation(fields: [createdById], references: [id])
  createdAt     DateTime       @default(now())

  questions   TestQuestion[]
  submissions Submission[]
}

// SNAPSHOT: câu hỏi của đề được "đóng băng" tại thời điểm tạo đề.
// Sửa/xóa Question gốc KHÔNG ảnh hưởng đề đã tạo. Đề AI sinh cũng lưu vào đây.
model TestQuestion {
  id            String       @id @default(uuid())
  testId        String
  test          Test         @relation(fields: [testId], references: [id], onDelete: Cascade)
  type          QuestionType                 // chỉ MCQ | ESSAY (đề thi không có flashcard)
  gradingType   GradingType?
  questionText  String
  correctAnswer String
  wrongAnswers  Json?
  points        Float        @default(1)
  position      Int          @default(0)

  answers SubmissionAnswer[]
}

model Submission {
  id          String           @id @default(uuid())
  testId      String
  test        Test             @relation(fields: [testId], references: [id], onDelete: Cascade)
  studentId   String
  student     User             @relation(fields: [studentId], references: [id])
  status      SubmissionStatus @default(IN_PROGRESS)
  startedAt   DateTime         @default(now())
  submittedAt DateTime?
  score       Float?
  maxScore    Float?

  answers SubmissionAnswer[]

  @@unique([testId, studentId])              // MVP: mỗi học sinh làm 1 lần/đề
}

model SubmissionAnswer {
  id             String       @id @default(uuid())
  submissionId   String
  submission     Submission   @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  testQuestionId String
  testQuestion   TestQuestion @relation(fields: [testQuestionId], references: [id])
  answerText     String?                     // MCQ: lưu nguyên văn đáp án đã chọn
  isCorrect      Boolean?
  pointsAwarded  Float?
  aiFeedback     String?                     // lời phê ngắn của AI (≤ 15 từ)
  gradedBy       GradedBy     @default(AUTO)

  @@unique([submissionId, testQuestionId])
}

model AiUsageLog {
  id           String    @id @default(uuid())
  userId       String?                       // ai kích hoạt call này
  purpose      AiPurpose
  model        String
  inputTokens  Int
  outputTokens Int
  costVnd      Float                         // ước tính, tính từ bảng giá trong ENV
  createdAt    DateTime  @default(now())

  @@index([createdAt])
}
```

### 4.3. Migration thủ công bổ sung (search tiếng Việt)

Prisma không quản lý extension → tạo 1 migration SQL tay:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE INDEX idx_courses_name_trgm ON "Course" USING GIN (name gin_trgm_ops);
CREATE INDEX idx_groups_name_trgm  ON "Group"  USING GIN (name gin_trgm_ops);
CREATE INDEX idx_users_name_trgm   ON "User"   USING GIN (name gin_trgm_ops);
```

---
## PHẦN 5 — ĐẶC TẢ CHỨC NĂNG CHI TIẾT

> Mỗi chức năng gồm: mô tả → luồng → tiêu chí nghiệm thu (AC) → edge cases. AI agent phải đảm bảo mọi AC đều pass trước khi coi chức năng là xong.

### F1 — Học tập đa chế độ (Multi-mode Learning) — STUDENT

Học sinh mở một Khóa học được gán cho nhóm của mình (hoặc khóa public) và chọn 1 trong 3 chế độ. Dữ liệu lấy từ bảng `Question` của khóa đó. **Luyện tập hoàn toàn miễn phí AI, trừ duy nhất trường hợp essay AI.**

**F1.1 Flashcard** (`type = FLASHCARD`)
- Hiển thị mặt trước (`questionText`) → bấm/click lật thẻ (animation flip 3D CSS ~300ms) → mặt sau hiện `correctAnswer` + `explanation`.
- Điều hướng: nút Trước/Sau, phím ← → và Space (lật). Hiển thị tiến độ `12/50`. Nút xáo trộn thứ tự.
- AC: lật mượt không giật trên mobile; hết bộ thẻ hiện màn hình "Hoàn thành" + nút học lại.

**F1.2 Trắc nghiệm (MCQ)** (`type = MCQ`)
- Mỗi câu hiển thị 4 lựa chọn = `correctAnswer` + 3 phần tử `wrongAnswers`, **xáo trộn vị trí mỗi lần render**.
- Chọn đáp án → chấm ngay bằng code FE (so sánh chuỗi đáp án đã chọn với `correctAnswer`): đúng tô xanh, sai tô đỏ + tô xanh đáp án đúng → nút "Câu tiếp theo".
- Kết thúc: màn tổng kết số câu đúng/sai + danh sách câu sai để ôn lại.
- AC: không thể đổi đáp án sau khi đã chọn; thứ tự A/B/C/D random nhưng ổn định trong 1 câu.

**F1.3 Tự luận ngắn (Short Answer)** (`type = ESSAY`)
- Học sinh gõ câu trả lời vào ô text → bấm "Kiểm tra".
- Nếu `gradingType = EXACT`: chấm bằng hàm `normalizeAnswer()` (Phần 9.2) ở **backend** (endpoint `POST /practice/check-exact`, không gọi AI, 0 đồng). Trùng → Đúng.
- Nếu `gradingType = AI`: gọi `POST /practice/check-ai` → BE kiểm tra rate limit Redis → gọi Gemini Prompt 1 (Phần 7.3) cho **1 câu** → trả `{correct, score, feedback}`.
- AC: khi hết quota AI trong ngày, FE hiển thị thông báo rõ ràng "Bạn đã dùng hết N lượt kiểm tra AI hôm nay" thay vì lỗi chung chung; câu EXACT không bao giờ tạo bản ghi `AiUsageLog`.

### F2 — Quản lý Khóa học (Course Management) — TEACHER

- CRUD khóa học (tên, mô tả, public/private).
- Trong trang chi tiết khóa học: bảng câu hỏi có filter theo `type`, thêm/sửa/xóa câu hỏi bằng dialog form. Form thay đổi theo `type`:
  - FLASHCARD: mặt trước, mặt sau, ví dụ (optional).
  - MCQ: câu hỏi, đáp án đúng, đúng 3 đáp án nhiễu (validate đủ 3, không trùng đáp án đúng).
  - ESSAY: câu hỏi, đáp án mẫu, chọn cơ chế chấm `EXACT | AI` (radio, có tooltip giải thích chi phí).
- Teacher chỉ sửa/xóa được khóa học **do mình tạo** (ADMIN sửa được tất cả).
- AC: xóa khóa học → cascade xóa câu hỏi (confirm dialog cảnh báo số câu hỏi bị xóa); đề thi đã tạo từ khóa đó **không** bị ảnh hưởng (vì đã snapshot).

### F3 — Quản lý Nhóm (Group Management) — TEACHER

- CRUD nhóm (tên, mô tả, public/private).
- Quản lý thành viên: thêm học sinh theo email, xóa thành viên, danh sách thành viên.
- Gán/bỏ gán nhiều khóa học vào nhóm (bảng `GroupCourse`).
- Học sinh trong nhóm thấy toàn bộ khóa học được gán ở dashboard của mình.
- AC: thêm email không tồn tại → báo lỗi rõ ràng; thêm trùng → báo "đã là thành viên"; học sinh bị xóa khỏi nhóm mất quyền truy cập khóa học private của nhóm ngay lập tức (nhưng bài thi đã nộp vẫn giữ).

### F4 — Tìm kiếm (Search) — MỌI ROLE

- Thanh search ở Dashboard, tìm đồng thời **Khóa học public** + **Nhóm public** theo: tên khóa, tên nhóm, tên giáo viên tạo.
- MVP: query Postgres `unaccent(lower(name)) ILIKE unaccent(lower('%q%'))` (tìm không dấu: gõ "tieng anh" ra "Tiếng Anh") + index trigram. Debounce 300ms phía FE, tối đa 10 kết quả mỗi loại.
- Kiến trúc: bọc trong interface `SearchService { search(q): SearchResult }` với implementation `PostgresSearchService` → post-MVP thay bằng `ElasticSearchService` mà không sửa controller.
- AC: tìm không dấu hoạt động; nhóm/khóa private không bao giờ lộ trong kết quả.

### F5 — Tạo bài kiểm tra (Test Generator) — TEACHER

Wizard 3 bước: **(1) Nguồn → (2) Chế độ → (3) Cấu hình & Xem trước**.

- **Bước 1 — Nguồn (Source):** chọn 1 Khóa học HOẶC 1 Nhóm. Nếu chọn Nhóm → hệ thống tự gom toàn bộ `Question` của mọi khóa học đã gán vào nhóm đó.
- **Bước 2 — Chế độ:**
  - **Thủ công (bốc câu cũ):** chọn "Ngẫu nhiên N câu MCQ + M câu essay" hoặc tick chọn từng câu từ danh sách. Hệ thống **copy** câu được chọn vào `TestQuestion` (snapshot). Flashcard không đưa vào đề.
  - **AI biên soạn đề mới:** giáo viên nhập X (số câu MCQ) và Y (số câu essay) → BE gom toàn bộ nội dung gốc (cặp `questionText`/`correctAnswer` của mọi câu trong nguồn) → gọi Gemini Prompt 2 (Phần 7.4) **đúng 1 lần** → validate JSON bằng zod → lưu thẳng vào `TestQuestion` với `isAiGenerated = true`. Câu essay AI sinh mặc định `gradingType = AI` (giáo viên sửa được ở bước 3).
- **Bước 3 — Cấu hình:** tiêu đề, thời gian làm bài (phút), điểm mỗi câu; xem trước toàn bộ đề, cho phép sửa tay/xóa từng câu AI sinh ra trước khi bấm **Xuất bản** (`status = PUBLISHED`).
- AC: nguồn không có câu hỏi → chặn tạo đề với thông báo; AI trả JSON hỏng → retry 1 lần, vẫn hỏng → hiện lỗi "AI tạo đề thất bại, thử lại" và **không** lưu rác vào DB; mỗi lần bấm tạo đề AI ghi 1 dòng `AiUsageLog(purpose=GENERATION)`; đề DRAFT học sinh không nhìn thấy.

### F6 — Làm bài kiểm tra (Testing Engine) — STUDENT

- Học sinh trong nhóm/khóa tương ứng thấy danh sách đề `PUBLISHED` → bấm "Vào thi" → `POST /tests/:id/start` tạo `Submission(IN_PROGRESS)` và trả `startedAt`.
- **Phòng thi:** đồng hồ đếm ngược tính từ `startedAt + durationMin` (nguồn sự thật là server — F5 refresh trang không reset được giờ). Sidebar điều hướng câu, đánh dấu câu đã trả lời. Autosave đáp án mỗi 10 giây + khi chuyển câu (`PATCH /submissions/:id/answers`).
- **Hết giờ:** FE tự động nộp; BE cũng từ chối mọi autosave/submit sau deadline + grace 30 giây.
- **Nộp bài:** chạy pipeline chấm ở Phần 3.3. Response ngay lập tức gồm điểm phần đã chấm + `status`.
- **Màn hình kết quả** (`/submissions/:id/result`):
  - Tổng điểm to, rõ. Từng câu: nền **xanh** nếu đúng, **đỏ** nếu sai; hiển thị đáp án của học sinh, đáp án đúng, và `aiFeedback` (nếu có) dưới dạng badge "AI nhận xét".
  - Nếu `status = GRADING`: hiện spinner "AI đang chấm phần tự luận..." + poll 3s.
  - Nếu `GRADING_FAILED`: hiện "Một số câu đang chờ giáo viên chấm" — điểm hiển thị là điểm tạm.
- **Giáo viên:** trang xem toàn bộ bài nộp của 1 đề (bảng: học sinh, điểm, trạng thái) + nút "Chấm tay" cho các câu `gradedBy = PENDING` (nhập điểm + nhận xét → tổng điểm tự tính lại, `status → GRADED`).
- AC: 1 học sinh không thể start 2 lần cùng 1 đề (unique constraint → trả về submission cũ); toàn bộ câu essay AI của 1 bài nộp được gom vào **đúng 1** call Gemini; học sinh chỉ xem được kết quả của chính mình.

---

## PHẦN 6 — API SPECIFICATION (REST)

Prefix chung: `/api/v1`. Auth bằng header `Authorization: Bearer <accessToken>`. Response lỗi thống nhất: `{ statusCode, message, error }`.

| Module | Method & Path | Role | Mô tả |
|---|---|---|---|
| auth | POST `/auth/register` | public | Đăng ký (email, password ≥ 8 ký tự, name). Mặc định role STUDENT |
| auth | POST `/auth/login` | public | Trả `{accessToken, refreshToken, user}` |
| auth | POST `/auth/refresh` | public | Cấp lại access token (refresh token đối chiếu Redis) |
| auth | POST `/auth/google` | public | (Phase 4) Nhận Firebase ID token → verify → tạo/tìm user → JWT |
| auth | GET `/auth/me` | mọi role | Thông tin user hiện tại |
| users | GET `/users` · PATCH `/users/:id/role` | ADMIN | Danh sách user, đổi role |
| groups | GET/POST `/groups` · GET/PATCH/DELETE `/groups/:id` | TEACHER+ | CRUD nhóm (GET list: nhóm của tôi / nhóm tôi là thành viên) |
| groups | POST/DELETE `/groups/:id/members` | TEACHER+ | Thêm (theo email) / xóa thành viên |
| groups | POST/DELETE `/groups/:id/courses/:courseId` | TEACHER+ | Gán / bỏ gán khóa học |
| courses | GET/POST `/courses` · GET/PATCH/DELETE `/courses/:id` | TEACHER+ (đọc: mọi role có quyền) | CRUD khóa học |
| questions | GET/POST `/courses/:courseId/questions` · PATCH/DELETE `/questions/:id` | TEACHER+ | CRUD câu hỏi, filter `?type=` |
| search | GET `/search?q=` | mọi role | Trả `{courses[], groups[]}` public |
| practice | GET `/courses/:id/practice?mode=` | STUDENT+ | Lấy bộ câu hỏi luyện tập theo mode |
| practice | POST `/practice/check-exact` | STUDENT+ | Body `{questionId, answer}` → chấm cứng |
| practice | POST `/practice/check-ai` | STUDENT+ | Chấm AI 1 câu (qua rate limit) |
| tests | POST `/tests` | TEACHER+ | Tạo đề thủ công `{title, sourceType, sourceId, durationMin, mode: 'random'|'pick', ...}` |
| tests | POST `/tests/ai-generate` | TEACHER+ | Tạo đề AI `{title, sourceType, sourceId, durationMin, mcqCount, essayCount}` |
| tests | GET `/tests` · GET `/tests/:id` · PATCH `/tests/:id` · DELETE | TEACHER+ (student: chỉ list PUBLISHED được phép) | Quản lý đề; PATCH đổi status DRAFT→PUBLISHED→CLOSED, sửa/xóa TestQuestion khi còn DRAFT |
| submissions | POST `/tests/:id/start` | STUDENT | Bắt đầu làm bài |
| submissions | PATCH `/submissions/:id/answers` | STUDENT (chủ bài) | Autosave: `{answers: [{testQuestionId, answerText}]}` |
| submissions | POST `/submissions/:id/submit` | STUDENT (chủ bài) | Nộp → pipeline chấm |
| submissions | GET `/submissions/:id` | chủ bài hoặc TEACHER+ | Chi tiết + kết quả (FE poll khi GRADING) |
| submissions | GET `/tests/:id/submissions` | TEACHER+ | Bảng kết quả cả lớp |
| grading | PATCH `/submission-answers/:id/manual-grade` | TEACHER+ | Chấm tay câu PENDING `{pointsAwarded, feedback}` |
| stats | GET `/stats/ai-usage?from=&to=` | ADMIN | Tổng call, token, chi phí VNĐ theo ngày + theo purpose |

---
## PHẦN 7 — TÍCH HỢP AI (GEMINI) & CHIẾN LƯỢC CHI PHÍ

### 7.1. Nguyên tắc kiến trúc

- **Một cổng duy nhất:** mọi lời gọi Gemini đi qua `AiService` (module `ai/`). Không module nào khác được import SDK Gemini trực tiếp.
- `AiService` chịu trách nhiệm: (1) gọi API với `responseSchema` (structured output — ép Gemini trả JSON đúng schema thay vì "năn nỉ" bằng prompt), (2) validate lại bằng zod, (3) retry tối đa 2 lần với backoff, (4) ghi `AiUsageLog` cho **mọi** call kể cả call lỗi, (5) đọc bảng giá từ ENV để quy đổi token → VNĐ.
- SDK: `@google/genai` (official). Model mặc định `GEMINI_MODEL=gemini-2.5-flash-lite`, có thể đổi qua ENV không cần sửa code.
- **Lưu ý cho agent:** kiểm tra tên model và bảng giá mới nhất tại thời điểm build (docs Google AI); giá trong ENV example chỉ là placeholder.

### 7.2. Rate limit (bảo vệ ví tiền)

- Redis key: `rl:ai:{userId}:{YYYYMMDD}` → `INCR` + `EXPIREAT` cuối ngày (giờ Việt Nam, `Asia/Ho_Chi_Minh`).
- Quota qua ENV: `AI_PRACTICE_DAILY_LIMIT=20` (học sinh, chấm luyện tập), `AI_GENERATE_DAILY_LIMIT=10` (giáo viên, tạo đề). **Chấm bài thi (submit) không tính vào quota học sinh** — vì mỗi đề chỉ nộp 1 lần, chi phí đã bị chặn bởi unique constraint.
- Vượt quota → HTTP 429 + message tiếng Việt rõ ràng, FE hiển thị số lượt còn lại (endpoint `GET /practice/quota`).

### 7.3. Prompt 1 — Chấm tự luận tương đối (batch)

Dùng cho: (a) nộp bài thi — gom mọi câu essay AI của 1 bài vào 1 call; (b) luyện tập — mảng 1 phần tử.

**System instruction (cố định → hưởng implicit caching):**

```text
Bạn là trợ lý khảo thí nghiêm túc và công bằng. Với mỗi mục trong danh sách,
hãy so sánh "Bài làm" của học sinh với "Đáp án mẫu" của "Câu hỏi".
Quy tắc chấm:
- Chấp nhận câu trả lời đồng nghĩa, diễn đạt lại nhưng đúng bản chất.
- Bỏ qua lỗi chính tả/ngữ pháp nhỏ không làm sai nghĩa.
- Bài làm rỗng, lạc đề, hoặc chỉ chép lại câu hỏi → score = 0.
- score theo thang 0-10; correct = true khi score >= 7.
- feedback: chỉ ra lỗi sai chính, TỐI ĐA 15 TỪ, tiếng Việt. Nếu đúng hoàn toàn để chuỗi rỗng.
Chấm từng mục ĐỘC LẬP. Không thêm bất kỳ nội dung nào ngoài JSON.
```

**User content (mỗi lần gọi):**

```json
{"items":[{"i":0,"question":"...","sample_answer":"...","student_answer":"..."}, ...]}
```

**responseSchema (Gemini structured output) + zod đối chiếu:**

```json
{"type":"ARRAY","items":{"type":"OBJECT","properties":{
  "i":{"type":"INTEGER"},"correct":{"type":"BOOLEAN"},
  "score":{"type":"NUMBER"},"feedback":{"type":"STRING"}},
  "required":["i","correct","score","feedback"]}}
```

Quy đổi điểm câu: `pointsAwarded = (score / 10) * testQuestion.points`. Kết quả thiếu index nào → câu đó `gradedBy = PENDING`.

### 7.4. Prompt 2 — AI biên soạn đề mới (chạy 1 lần khi giáo viên bấm tạo)

**System instruction:**

```text
Bạn là chuyên gia ra đề. Đọc danh sách kiến thức gốc (cặp câu hỏi - đáp án)
và biên soạn một đề thi HOÀN TOÀN MỚI kiểm tra đúng phạm vi kiến thức đó:
- Đúng {X} câu trắc nghiệm (mcq): 1 đáp án đúng + đúng 3 đáp án nhiễu hợp lý,
  nhiễu không được đồng nghĩa với đáp án đúng.
- Đúng {Y} câu tự luận ngắn (essay): kèm đáp án mẫu chính xác, súc tích.
- Không sao chép nguyên văn câu hỏi gốc. Độ khó tương đương dữ liệu gốc.
- Toàn bộ bằng tiếng Việt (giữ nguyên thuật ngữ/từ vựng ngoại ngữ nếu là môn ngoại ngữ).
Chỉ trả về JSON đúng schema.
```

**User content:** `{"knowledge":[{"q":"...","a":"..."}, ...]}` (gom từ mọi Question của nguồn, mọi type).

**responseSchema:**

```json
{"type":"ARRAY","items":{"type":"OBJECT","properties":{
  "type":{"type":"STRING","enum":["mcq","essay"]},
  "q":{"type":"STRING"},"a":{"type":"STRING"},
  "w":{"type":"ARRAY","items":{"type":"STRING"}}},
  "required":["type","q","a"]}}
```

Zod kiểm tra thêm: mcq phải có đúng 3 phần tử `w`; tổng số câu đúng X+Y (thiếu/thừa → retry 1 lần, vẫn sai → fail sạch, không lưu DB).

### 7.5. Ước tính chi phí (kiểm chứng ràng buộc ≤ 100k VNĐ/tháng)

Giả định gemini-2.5-flash-lite (bậc giá rẻ nhất, ~0.10 USD/1M token input, ~0.40 USD/1M output — agent verify lại giá hiện hành):

| Hoạt động | Ước tính token/lần | Tần suất/tháng | Chi phí ước tính |
|---|---|---|---|
| Chấm 1 bài thi (5 câu essay AI, batch 1 call) | ~1.5k in / 0.3k out | 20 HS × 8 đề = 160 | ~700 VNĐ |
| Luyện tập chấm AI | ~0.4k in / 0.1k out | 20 HS × 20 lượt × 30 ngày = 12.000 (trần quota) | ~15.000 VNĐ (thực tế thấp hơn nhiều) |
| Tạo đề AI | ~4k in / 3k out | 30 lần | ~1.500 VNĐ |
| **Tổng** | | | **≪ 100.000 VNĐ/tháng** ✅ |

Kết luận: chi phí chủ yếu nằm ở VPS, không phải AI — miễn là giữ đúng nguyên tắc "đề AI lưu DB, không gọi lại".

---

## PHẦN 8 — FRONTEND SPECIFICATION (NEXT.JS)

### 8.1. Route map

| Route | Role | Nội dung |
|---|---|---|
| `/login` · `/register` | public | Form auth (Phase 4 thêm nút Google) |
| `/dashboard` | mọi role | Thanh search (F4) · Nhóm của tôi · Khóa học của tôi · Đề thi đang mở (student) |
| `/groups/[id]` | member/owner | Tab: Khóa học được gán · Thành viên · Đề thi của nhóm |
| `/courses/[id]` | có quyền xem | Mô tả + 3 nút chế độ luyện tập + (teacher) tab quản lý câu hỏi |
| `/courses/[id]/practice/flashcard` | STUDENT+ | F1.1 |
| `/courses/[id]/practice/mcq` | STUDENT+ | F1.2 |
| `/courses/[id]/practice/essay` | STUDENT+ | F1.3 (hiển thị quota AI còn lại) |
| `/teach/courses` · `/teach/groups` | TEACHER+ | Danh sách + CRUD (F2, F3) |
| `/teach/tests` · `/teach/tests/new` | TEACHER+ | Danh sách đề + Wizard 3 bước (F5) |
| `/teach/tests/[id]` | TEACHER+ | Xem trước đề, publish, bảng bài nộp, chấm tay PENDING |
| `/tests/[id]/take` | STUDENT | Phòng thi (F6): timer, sidebar câu, autosave |
| `/submissions/[id]/result` | chủ bài / TEACHER+ | Kết quả xanh/đỏ + AI feedback + polling |
| `/admin/stats` | ADMIN | Dashboard chi phí AI (chart theo ngày, bảng theo purpose) |

### 8.2. Quy ước kỹ thuật FE

- **API client:** wrapper `fetch` duy nhất tại `lib/api.ts` — tự gắn access token, tự refresh khi 401 rồi retry 1 lần, chuẩn hóa error message tiếng Việt.
- **State:** server state dùng TanStack Query (poll kết quả chấm bằng `refetchInterval: 3000` khi `status === 'GRADING'`); client state cục bộ dùng `useState/useReducer` — không thêm Redux.
- **Phòng thi:** đồng hồ = `deadline (server) - now`, hiệu chỉnh lệch giờ client bằng thời gian server trả về lúc start; cảnh báo đổi màu khi còn < 2 phút; `beforeunload` cảnh báo khi rời trang.
- **UI:** shadcn/ui + Tailwind; responsive mobile-first (học sinh dùng điện thoại là chính); màu đúng/sai: `green-500` / `red-500`; toàn bộ text tiếng Việt, không hardcode tiếng Anh trong UI.

---

## PHẦN 9 — YÊU CẦU PHI CHỨC NĂNG

### 9.1. Bảo mật

- Password hash bằng `bcrypt` (cost 10). JWT secret ≥ 32 ký tự, tách secret access/refresh. Refresh token lưu Redis (`rt:{userId}:{jti}`) → logout/thu hồi được.
- RBAC bằng guard + decorator `@Roles(Role.TEACHER)`; kiểm tra **ownership** ở tầng service (teacher chỉ đụng tài nguyên mình tạo; student chỉ đụng submission của mình).
- Validate mọi DTO (`class-validator`, `whitelist: true, forbidNonWhitelisted: true`). CORS chỉ mở cho domain FE. Helmet bật mặc định. Không bao giờ trả `passwordHash` ra API (Prisma `select` tường minh hoặc interceptor serialize).
- Đề thi trả cho học sinh khi làm bài **không được chứa** `correctAnswer`/`wrongAnswers` đã đánh dấu — BE trộn sẵn 4 lựa chọn thành mảng `options[]` và chỉ trả mảng đó.

### 9.2. Chuẩn hóa chuỗi tiếng Việt — `normalizeAnswer()` (hàm dùng chung, đặt ở `packages/shared`)

Thứ tự xử lý: (1) Unicode normalize **NFC** (gõ tiếng Việt kiểu tổ hợp vs dựng sẵn phải bằng nhau) → (2) `trim()` → (3) `toLowerCase()` → (4) bỏ dấu câu ở đầu/cuối và dấu câu thừa (`.,;:!?"'`) → (5) gộp mọi khoảng trắng liên tiếp thành 1 space. **Không bỏ dấu thanh tiếng Việt** ("của" ≠ "cua"). Bắt buộc có unit test với các case: `"  Hà Nội. "` = `"hà nội"`, NFC vs NFD, nhiều space, hoa/thường.

Riêng search (F4) thì **có** dùng `unaccent` (tìm không dấu) — hai ngữ cảnh khác nhau, không dùng chung logic.

### 9.3. Vận hành

- Logging: NestJS Logger, log mọi call AI (model, token, ms, cost) và mọi request lỗi 5xx. Health check `GET /health` (kiểm tra DB + Redis).
- Config qua ENV, validate lúc boot bằng zod — thiếu biến bắt buộc → app từ chối khởi động với message rõ ràng.
- Timezone hệ thống: `Asia/Ho_Chi_Minh` cho mọi logic "theo ngày" (quota, thống kê).

---

## PHẦN 10 — KẾ HOẠCH 4 TUẦN (PHASE PLAN CHO AI AGENT)

> Mỗi phase là một đơn vị bàn giao. **DoD (Definition of Done)** là checklist bắt buộc pass trước khi sang phase sau.

### 🔵 PHASE 1 (Tuần 1) — Nền móng: Hạ tầng, Auth, CRUD, Search

Tasks:
1. Khởi tạo monorepo pnpm theo cấu trúc Phần 3.2; `docker-compose.yml` (postgres, redis, minio) theo Phần 11; `.env.example` đầy đủ.
2. Prisma schema đúng nguyên văn Phần 4.2 + migration extension Phần 4.3 + `seed.ts` (Phần 11.3).
3. Module `auth`: register/login/refresh/me, guards JWT + Roles, refresh token trong Redis.
4. Module `users`, `groups` (kèm members + gán khóa học), `courses`, `questions` — đầy đủ endpoint Phần 6, có ownership check.
5. Module `search` (F4) với interface `SearchService`.
6. FE: layout chung + login/register + dashboard khung + trang CRUD của teacher (`/teach/courses`, `/teach/groups`, trang chi tiết khóa học với bảng câu hỏi + dialog form 3 loại câu hỏi).

DoD: `docker compose up` chạy sạch một lệnh; luồng E2E bằng tay: đăng ký teacher (đổi role qua seed admin) → tạo khóa → thêm 3 loại câu hỏi → tạo nhóm → thêm student theo email → gán khóa vào nhóm → login student thấy khóa học ở dashboard → search có dấu/không dấu đều ra; unit test `normalizeAnswer()` pass; không endpoint nào trả `passwordHash`.

### 🟢 PHASE 2 (Tuần 2) — Bộ máy luyện tập & chấm cứng (0 đồng AI)

Tasks:
1. FE Flashcard (F1.1): flip animation, phím tắt, shuffle, màn hoàn thành.
2. FE MCQ (F1.2): trộn đáp án, chấm tức thì FE, màn tổng kết.
3. Essay EXACT (F1.3): endpoint `check-exact` dùng `normalizeAnswer()`, UI kết quả Đúng/Sai + hiện đáp án mẫu khi sai.
4. Endpoint `GET /courses/:id/practice?mode=` với kiểm tra quyền truy cập khóa học.

DoD: 3 chế độ chạy mượt trên mobile viewport 390px; unit test hàm trộn đáp án + chấm exact (kèm case tiếng Việt); học sinh ngoài nhóm không luyện được khóa private (403).

### 🟠 PHASE 3 (Tuần 3) — AI: Sinh đề, Phòng thi, Pipeline chấm

Tasks:
1. Module `ai`: `AiService` theo Phần 7.1 (structured output, zod, retry, `AiUsageLog`, bảng giá ENV) + rate limit Redis Phần 7.2 + endpoint quota.
2. Chấm AI luyện tập (F1.3 nhánh AI) — dùng Prompt 1 với mảng 1 phần tử.
3. Module `tests`: wizard tạo đề thủ công (random/pick → snapshot `TestQuestion`) + `POST /tests/ai-generate` (Prompt 2) + publish flow.
4. Module `submissions` + `grading`: start (unique), autosave, deadline server-side, submit → chấm sync MCQ/EXACT → enqueue BullMQ → worker chấm batch Prompt 1 → cập nhật điểm/status; nhánh fail → `GRADING_FAILED` + PENDING.
5. FE: wizard 3 bước (F5), phòng thi (F6) với timer + autosave + sidebar.

DoD: tạo đề AI 5 MCQ + 3 essay từ 1 khóa thật → đề lưu DB, xem trước sửa được, `AiUsageLog` có dòng GENERATION; nộp bài có cả 3 loại chấm → MCQ/EXACT ra điểm ngay, essay AI graded trong < 30s qua worker, đúng 1 call Gemini/bài; giả lập Gemini trả JSON hỏng (mock) → sau retry rơi vào GRADING_FAILED, không crash; vượt quota luyện tập → 429 message tiếng Việt; F5 trang thi không reset đồng hồ.

### 🔴 PHASE 4 (Tuần 4) — Kết quả, Chấm tay, Chi phí, Đóng gói

Tasks:
1. FE màn kết quả xanh/đỏ + AI feedback + polling (F6) và bảng bài nộp + chấm tay PENDING cho teacher.
2. `GET /stats/ai-usage` + trang `/admin/stats` (tổng chi phí VNĐ, chart theo ngày).
3. (Tùy chọn) Google Sign-In qua Firebase; (tùy chọn) upload avatar MinIO/S3.
4. Rà soát bảo mật theo checklist 9.1; polish UI/UX, empty state, loading state, thông báo lỗi tiếng Việt toàn hệ thống.
5. Seed 20 tài khoản học sinh thật; hướng dẫn deploy VPS (docker compose + Caddy/Nginx reverse proxy + HTTPS) trong `README.md`.

DoD: kịch bản nghiệm thu đầy đủ end-to-end với 2 học sinh + 1 giáo viên chạy trơn tru; dashboard chi phí khớp số dòng `AiUsageLog`; README đủ để người khác dựng lại từ zero trong 15 phút.

### 10.1. Kickoff prompt mẫu cho từng phase (dán vào Claude Code / Gemini CLI)

```text
Đọc file MINI-LMS-MASTER-SPEC.md ở root repo. Tuân thủ tuyệt đối PHẦN 0.
Thực hiện PHASE {N} theo đúng danh sách task và phạm vi trong PHẦN 10.
Tham chiếu: schema ở PHẦN 4, API ở PHẦN 6, AI ở PHẦN 7, FE ở PHẦN 8.
Làm từng task một, commit sau mỗi task. Kết thúc: tự chạy toàn bộ mục DoD
của PHASE {N}, báo cáo kết quả từng mục pass/fail. Nếu spec mâu thuẫn
hoặc thiếu thông tin, dừng lại hỏi tôi trước khi tự quyết.
```

---

## PHẦN 11 — MÔI TRƯỜNG & DỮ LIỆU KHỞI TẠO

### 11.1. Biến môi trường (`.env.example`)

```env
# App
NODE_ENV=development
API_PORT=4000
WEB_URL=http://localhost:3000
TZ=Asia/Ho_Chi_Minh

# Database & Redis
DATABASE_URL=postgresql://minilms:minilms@localhost:5432/minilms
REDIS_URL=redis://localhost:6379

# Auth
JWT_ACCESS_SECRET=change-me-32-chars-minimum-secret!!
JWT_REFRESH_SECRET=change-me-too-32-chars-minimum!!!!
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
# (Phase 4, tùy chọn) FIREBASE_PROJECT_ID= / GOOGLE_APPLICATION_CREDENTIALS=

# AI
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite
AI_PRACTICE_DAILY_LIMIT=20
AI_GENERATE_DAILY_LIMIT=10
# Bảng giá quy đổi (VNĐ / 1 triệu token) — cập nhật theo giá thực tế
AI_PRICE_INPUT_PER_1M_VND=2600
AI_PRICE_OUTPUT_PER_1M_VND=10400

# Storage (tùy chọn Phase 4)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=minilms
```

### 11.2. `docker-compose.yml` (khung)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment: { POSTGRES_USER: minilms, POSTGRES_PASSWORD: minilms, POSTGRES_DB: minilms }
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment: { MINIO_ROOT_USER: minioadmin, MINIO_ROOT_PASSWORD: minioadmin }
    ports: ["9000:9000", "9001:9001"]
    volumes: [miniodata:/data]
  api:
    build: ./apps/api
    env_file: .env
    depends_on: [postgres, redis]
    ports: ["4000:4000"]
  web:
    build: ./apps/web
    environment: { NEXT_PUBLIC_API_URL: http://localhost:4000/api/v1 }
    depends_on: [api]
    ports: ["3000:3000"]
volumes: { pgdata: {}, miniodata: {} }
```

### 11.3. Seed data (`prisma/seed.ts`)

- 1 ADMIN (`admin@minilms.local` / `Admin@12345`), 1 TEACHER (`teacher@minilms.local`), 2 STUDENT.
- 1 nhóm "Lớp Demo" (2 student là thành viên), 1 khóa "Tiếng Anh Giao Tiếp Cơ Bản" gán vào nhóm.
- 12 câu hỏi mẫu: 4 flashcard, 4 MCQ, 2 essay EXACT, 2 essay AI — nội dung từ vựng tiếng Anh thông dụng.

---

## PHẦN 12 — BACKLOG SAU MVP (KHÔNG LÀM Ở 4 TUẦN ĐẦU)

1. **ElasticSearch** thay `PostgresSearchService` (giữ nguyên interface).
2. **Spaced repetition** cho flashcard (bảng `question_progress`: đúng/sai, lần ôn kế tiếp).
3. Import/Export câu hỏi CSV/Excel; ảnh & audio trong câu hỏi (dùng S3/MinIO).
4. Làm lại bài thi nhiều lần + lịch sử điểm; thống kê tiến bộ theo học sinh/nhóm.
5. Thông báo (email/Zalo) khi có đề mới; SSE thay polling khi chờ chấm.
6. Chống gian lận nhẹ: log số lần rời tab trong phòng thi.

---

*Hết tài liệu. Mọi thay đổi phạm vi phải cập nhật vào file này trước, code sau.*

---

## CHANGE PLAN — 2026-07-28: Đảo ngược phụ thuộc Audit Log (base ↔ modules)

> Phụ lục thay đổi kiến trúc, không thay thế spec ở trên.
> **Lưu ý mâu thuẫn cần user xác nhận:** Phần 2 của spec này mandate **Prisma**, nhưng dự án hiện đang chạy **TypeORM 1.0** và user đã chốt giữ TypeORM (xem AI/logs/2026-07-28.md). Spec cần được cập nhật hoặc quyết định lại.

**Vấn đề:** `src/base/` được dùng làm khung tái sử dụng cho nhiều dự án, nhưng đang phụ thuộc ngược lên `src/modules/`
(interceptor import `AuditLogHelperService`, interface import `User` từ `@modules`). Copy `base/` sang project khác là gãy.

**Giải pháp (dependency inversion):**

1. `base/interfaces/audit-log.interface.ts` định nghĩa contract trừu tượng: token `AUDIT_LOG_WRITER` + `IAuditLogWriter`
   (5 method: logCreate/logUpdate/logDelete/logRestore/logAction). Type dùng `AuditAction` và `User` của base.
2. `base/interceptors/audit-log.interceptor.ts` inject `@Optional() @Inject(AUDIT_LOG_WRITER)` — không có writer thì no-op.
3. `base/apis/services/*`: `IAuditLogOptions.auditLogHelper` → `auditLogWriter` (kiểu contract, không phải class cụ thể).
4. `modules/audit-logs`: `AuditLogHelperService implements IAuditLogWriter`; module provide
   `{ provide: AUDIT_LOG_WRITER, useExisting: AuditLogHelperService }`.

**Kết quả:** mũi tên phụ thuộc chỉ còn một chiều `modules → base`. `base/` chỉ còn phụ thuộc: TypeORM (chấp nhận, xuyên suốt),
NestJS, class-validator/transformer, lodash, @nestjs-modules/mailer.

**Nguyên tắc phân chia (áp dụng từ nay):**
- `base/` = *cơ chế* (how): interceptor, decorator, base service, filter, contract. Không sở hữu bảng DB, không có endpoint.
- `modules/` = *feature* (what): có entity/migration riêng, controller, vòng đời dữ liệu.
- Code chỉ có 1 consumer thì đặt cạnh consumer đó (colocation); chỉ "thăng cấp" lên `common/`/`utils/` khi có consumer thứ 2.

---

## CHANGE PLAN — 2026-07-28 (2): Error code declaration — phần hạ tầng trong base

**Phạm vi:** chỉ cơ chế + code hạ tầng (hữu hạn, biết trước). Domain code khai dần theo từng module khi port.

1. `base/common/errors/error-code.ts` — `BaseErrorCode` (const object + type, đồng bộ style `app.constant.ts`):
   `INTERNAL_ERROR`, `VALIDATION_FAILED`, `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`.
2. `base/common/errors/app.exception.ts` — `AppException extends HttpException` mang `code`/`args`/`details`,
   kèm factory cho 7 code hạ tầng và `AppException.from(unknown)` để wrap lỗi lạ.
3. `base/filters/all-exceptions.filter.ts` — thêm `code` vào envelope; map `HttpException` theo status → code;
   lỗi không xác định **không** trả `e.message` ra client (chỉ log).
4. `src/i18n/vi/errors.json` + `common.json` — message cho 7 code (hiện `common.internal_error` đang thiếu → client
   nhận về đúng chuỗi key).
5. Base services: bỏ `throw new InternalServerErrorException(e.message)` (10 chỗ) → `AppException.from(e)`,
   giữ nguyên HttpException gốc thay vì biến mọi lỗi thành 500.
6. Guard test: mọi code đã khai phải có message ở **tất cả** locale trong `src/i18n/`.

**Không làm ở bước này:** domain error code của từng module; i18n cho message thành công của `TransformInterceptor`.

**Quy ước chốt (breaking nếu đổi sau):** tên code `<DOMAIN>_<WHAT>` viết hoa; mỗi module một file
`modules/<feature>/<feature>.errors.ts`; i18n key suy ra theo `errors.<CODE>`; không tái sử dụng/xóa code, chỉ deprecate.
