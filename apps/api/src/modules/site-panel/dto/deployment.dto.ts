import { z } from 'zod';
import {
  PublishDeploymentSchema,
  DeploymentQuerySchema,
  SiteDeploymentSchema,
} from '@repo/schemas';

export const PublishDeploymentDtoSchema = PublishDeploymentSchema;
export type PublishDeploymentDto = z.infer<typeof PublishDeploymentSchema>;

export const DeploymentQueryDtoSchema = DeploymentQuerySchema;
export type DeploymentQueryDto = z.infer<typeof DeploymentQuerySchema>;

export const SiteDeploymentDtoSchema = SiteDeploymentSchema;
export type SiteDeploymentDto = z.infer<typeof SiteDeploymentSchema>;









