import { IGetListData } from '@base/apis/services/base-common.service';
// TODO(auth): restore admin guards when the auth module is ported, then
// register this controller in AuditLogsModule again.
// import { Role } from '@base/common/enums/role.enum';
// import { Roles } from '@base/decorators/roles.decorator';
// import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
// import { RolesGuard } from '@modules/auth/guards/roles.guard';
import {
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuditLogFilterDto } from '@/modules/audit-logs/dto/audit-log-filter.dto';
import { AuditLogResponseDto } from '@/modules/audit-logs/dto/audit-log-response.dto';
import { AuditLog } from '@/modules/audit-logs/entities/audit-log.entity';
import { AuditLogService } from '@/modules/audit-logs/services/audit-log.service';

@ApiTags('Audit Logs')
@ApiBearerAuth('JWT')
// TODO(auth): @UseGuards(JwtAuthGuard, RolesGuard) + @Roles(Role.ADMINISTRATOR)
@Controller('audit-logs')
export class AuditLogsController {
  private readonly logger = new Logger(AuditLogsController.name);

  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'List all audit logs with filters' })
  @ApiResponse({
    status: 200,
    description: 'List of audit logs',
    type: [AuditLogResponseDto],
  })
  async findAll(
    @Query() filters: AuditLogFilterDto,
  ): Promise<IGetListData<AuditLog>> {
    return this.auditLogService.findWithFilters(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiResponse({
    status: 200,
    description: 'Audit log details',
    type: AuditLogResponseDto,
  })
  async findOne(@Param('id') id: string): Promise<AuditLog> {
    const auditLog = await this.auditLogService.findOne({ where: { id } });
    if (!auditLog) {
      throw new NotFoundException('Không tìm thấy nhật ký kiểm toán.');
    }
    return auditLog;
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get history of specific entity' })
  @ApiResponse({
    status: 200,
    description: 'Entity audit history',
    type: [AuditLogResponseDto],
  })
  async getEntityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query() filters: AuditLogFilterDto,
  ): Promise<IGetListData<AuditLog>> {
    return this.auditLogService.getEntityHistory(entityType, entityId, {
      filters: {
        page: filters.page,
        pageSize: filters.pageSize,
      },
    });
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get audit logs by user' })
  @ApiResponse({
    status: 200,
    description: 'User audit logs',
    type: [AuditLogResponseDto],
  })
  async findByUser(
    @Param('userId') userId: string,
    @Query() filters: AuditLogFilterDto,
  ): Promise<IGetListData<AuditLog>> {
    return this.auditLogService.findByUser(userId, {
      filters: {
        page: filters.page,
        pageSize: filters.pageSize,
      },
    });
  }
}
