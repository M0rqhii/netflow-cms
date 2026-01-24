import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DomainProvider,
  ConfigureDomainParams,
  DomainConfigurationResult,
  EnsureSSLParams,
} from '../interfaces/domain-provider.interface';

/**
 * DevDomainProvider
 * 
 * Development-only implementation that logs domain configuration requests
 * without actually configuring DNS or SSL.
 */
@Injectable()
export class DevDomainProvider implements DomainProvider {
  private readonly logger = new Logger(DevDomainProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  async configureDomain(params: ConfigureDomainParams): Promise<DomainConfigurationResult> {
    this.logger.log(`[DEV] Configuring domain: ${params.domain} for site: ${params.siteId}`);

    // Store domain record in DevDomainRecord table for observability
    try {
      const domainRecord = await this.prisma.devDomainRecord.upsert({
        where: {
          domain_siteId: {
            domain: params.domain,
            siteId: params.siteId,
          },
        },
        update: {
          targetUrl: params.targetUrl || null,
          status: 'configured',
          metadata: params.metadata || {},
          updatedAt: new Date(),
        },
        create: {
          domain: params.domain,
          siteId: params.siteId,
          targetUrl: params.targetUrl || null,
          status: 'configured',
          sslStatus: 'active',
          metadata: params.metadata || {},
        },
      });

      this.logger.log(`[DEV] Domain ${params.domain} configured (logged to database)`);

      return {
        domain: domainRecord.domain,
        status: domainRecord.status as DomainConfigurationResult['status'],
        dnsRecords: [
          {
            type: 'CNAME',
            name: params.domain,
            value: params.targetUrl || 'dev.example.com',
          },
        ],
        sslStatus: domainRecord.sslStatus as 'active' | 'pending' | 'failed',
        metadata: domainRecord.metadata as Record<string, any> || {},
      };
    } catch (error) {
      // If DevDomainRecord table doesn't exist yet, just log to console
      this.logger.warn(`[DEV] DevDomainRecord table not available, logging to console only`);
      this.logger.log(`[DEV DOMAIN] Domain: ${params.domain}, Site: ${params.siteId}, Target: ${params.targetUrl || 'N/A'}`);

      return {
        domain: params.domain,
        status: 'configured',
        dnsRecords: [
          {
            type: 'CNAME',
            name: params.domain,
            value: params.targetUrl || 'dev.example.com',
          },
        ],
        sslStatus: 'active',
        metadata: params.metadata || {},
      };
    }
  }

  async ensureSSL(params: EnsureSSLParams): Promise<{ sslStatus: 'active' | 'pending' | 'failed' }> {
    this.logger.log(`[DEV] Ensuring SSL for domain: ${params.domain}`);

    try {
      const domainRecord = await this.prisma.devDomainRecord.findUnique({
        where: {
          domain_siteId: {
            domain: params.domain,
            siteId: params.siteId,
          },
        },
      });

      if (domainRecord) {
        await this.prisma.devDomainRecord.update({
          where: {
            domain_siteId: {
              domain: params.domain,
              siteId: params.siteId,
            },
          },
          data: {
            sslStatus: 'active',
            updatedAt: new Date(),
          },
        });
      }

      this.logger.log(`[DEV] SSL status set to 'active' for domain: ${params.domain}`);
      return { sslStatus: 'active' };
    } catch (error) {
      this.logger.warn(`[DEV] DevDomainRecord table not available, assuming SSL is active`);
      return { sslStatus: 'active' };
    }
  }

  async removeDomain(domain: string, siteId: string): Promise<void> {
    this.logger.log(`[DEV] Removing domain: ${domain} for site: ${siteId}`);

    try {
      await this.prisma.devDomainRecord.delete({
        where: {
          domain_siteId: {
            domain,
            siteId: siteId,
          },
        },
      });
      this.logger.log(`[DEV] Domain ${domain} removed from database`);
    } catch (error: any) {
      if (error.code === 'P2025') {
        // Record doesn't exist, consider it removed
        this.logger.warn(`[DEV] Domain record not found, already removed`);
        return;
      }
      this.logger.warn(`[DEV] DevDomainRecord table not available`);
    }
  }

  async getDomainStatus(domain: string, siteId: string): Promise<DomainConfigurationResult | null> {
    try {
      const domainRecord = await this.prisma.devDomainRecord.findUnique({
        where: {
          domain_siteId: {
            domain,
            siteId: siteId,
          },
        },
      });

      if (!domainRecord) {
        return null;
      }

      return {
        domain: domainRecord.domain,
        status: domainRecord.status as DomainConfigurationResult['status'],
        sslStatus: domainRecord.sslStatus as 'active' | 'pending' | 'failed',
        metadata: domainRecord.metadata as Record<string, any> || {},
      };
    } catch (error) {
      this.logger.warn(`[DEV] DevDomainRecord table not available`);
      return null;
    }
  }
}









