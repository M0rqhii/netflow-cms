
import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { FeatureFlagGuard } from '../../common/auth/guards/feature-flag.guard';
import { CurrentSite } from '../../common/decorators/current-site.decorator';
import { FeatureKey } from '../../common/decorators/feature-key.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SiteModulesService } from './site-modules.service';
import { SiteModuleConfigDtoSchema } from './dto';

@UseGuards(AuthGuard, FeatureFlagGuard)
@FeatureKey('page_builder')
@Controller('site-panel/:siteId/modules')
export class SiteModulesController {
  constructor(private readonly modules: SiteModulesService) {}

  @Get('config')
  async getConfig(
    @Param('siteId') siteId: string,
    @CurrentSite() _: string,
  ) {
    return this.modules.getConfig(siteId);
  }

  @Patch('config')
  async updateConfig(
    @Param('siteId') siteId: string,
    @CurrentSite() _: string,
    @Body(new ZodValidationPipe(SiteModuleConfigDtoSchema)) body: any,
  ) {
    return this.modules.updateConfig(siteId, body as any);
  }
}
