import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HooksService } from './hooks.service';
import { CreateHookDto, UpdateHookDto, createHookSchema, updateHookSchema } from './dto';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { Permission } from '../../common/auth/roles.enum';
import { CurrentSite } from '../../common/decorators/current-site.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('hooks')
@UseGuards(AuthGuard, PermissionsGuard)
export class HooksController {
  constructor(private readonly hooksService: HooksService) {}

  /**
   * Create a hook
   */
  @Post()
  @Permissions(Permission.COLLECTIONS_WRITE)
  async create(
    @CurrentSite() siteId: string,
    @Body(new ZodValidationPipe(createHookSchema)) dto: CreateHookDto,
  ) {
    return this.hooksService.create(siteId, dto);
  }

  /**
   * Get all hooks
   */
  @Get()
  @Permissions(Permission.COLLECTIONS_READ)
  async findAll(
    @CurrentSite() siteId: string,
    @Query('collectionId') collectionId?: string,
  ) {
    return this.hooksService.findAll(siteId, collectionId);
  }

  /**
   * Get a single hook
   */
  @Get(':id')
  @Permissions(Permission.COLLECTIONS_READ)
  async findOne(
    @CurrentSite() siteId: string,
    @Param('id') id: string,
  ) {
    return this.hooksService.findOne(siteId, id);
  }

  /**
   * Update a hook
   */
  @Put(':id')
  @Permissions(Permission.COLLECTIONS_WRITE)
  async update(
    @CurrentSite() siteId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateHookSchema)) dto: UpdateHookDto,
  ) {
    return this.hooksService.update(siteId, id, dto);
  }

  /**
   * Delete a hook
   */
  @Delete(':id')
  @Permissions(Permission.COLLECTIONS_WRITE)
  async remove(
    @CurrentSite() siteId: string,
    @Param('id') id: string,
  ) {
    return this.hooksService.remove(siteId, id);
  }
}


