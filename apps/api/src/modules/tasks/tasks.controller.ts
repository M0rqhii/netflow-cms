import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { CurrentSite } from '../../common/decorators/current-site.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Role, Permission } from '../../common/auth/roles.enum';
import { CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';
import { TasksService } from './tasks.service';
import {
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema,
} from './dto';

/**
 * Tasks Controller
 * AI Note: RESTful API for workflow tasks
 */
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Permissions(Permission.CONTENT_WRITE)
  create(
    @CurrentSite() siteId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(createTaskSchema)) dto: unknown,
  ) {
    return this.tasksService.create(siteId, user.id, dto as any);
  }

  @Get()
  @Permissions(Permission.CONTENT_READ)
  list(
    @CurrentSite() siteId: string,
    @Query(new ZodValidationPipe(taskQuerySchema)) query: unknown,
  ) {
    return this.tasksService.list(siteId, query as any);
  }

  @Get(':id')
  @Permissions(Permission.CONTENT_READ)
  getById(
    @CurrentSite() siteId: string,
    @Param('id') id: string,
  ) {
    return this.tasksService.getById(siteId, id);
  }

  @Put(':id')
  @Permissions(Permission.CONTENT_WRITE)
  update(
    @CurrentSite() siteId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTaskSchema)) dto: unknown,
  ) {
    return this.tasksService.update(siteId, id, dto as any);
  }

  @Delete(':id')
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @Permissions(Permission.CONTENT_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @CurrentSite() siteId: string,
    @Param('id') id: string,
  ) {
    return this.tasksService.delete(siteId, id);
  }

  @Get('content-entry/:contentEntryId')
  @Permissions(Permission.CONTENT_READ)
  getTasksForContentEntry(
    @CurrentSite() siteId: string,
    @Param('contentEntryId') contentEntryId: string,
  ) {
    return this.tasksService.getTasksForContentEntry(siteId, contentEntryId);
  }
}

