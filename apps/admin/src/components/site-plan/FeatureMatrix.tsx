import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from '@repo/ui';
import type { FeatureMatrixRow } from './types';

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? 'bg-emerald-500' : 'bg-gray-300'
      } ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:opacity-90'}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

type FeatureMatrixProps = {
  rows: FeatureMatrixRow[];
  onToggle: (featureKey: string, nextEnabled: boolean) => void;
  pendingKey?: string | null;
  disabled?: boolean;
};

export function FeatureMatrix({ rows, onToggle, pendingKey, disabled }: FeatureMatrixProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Feature Matrix
          <span
            className="text-sm text-muted cursor-help"
            title="Feature overrides allow you to enable or disable features beyond your plan limits. Overrides are site-specific and may affect billing."
          >
            ℹ️
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            title="No features to show"
            description="Once features are configured for this plan, they will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Feature matrix table</caption>
              <thead>
                <tr className="text-left text-muted border-b">
                  <th scope="col" className="py-3 px-4 font-semibold">Feature</th>
                  <th scope="col" className="py-3 px-4 font-semibold">Description</th>
                  <th scope="col" className="py-3 px-4 font-semibold">
                    In Plan
                    <span className="text-xs font-normal text-muted ml-1" title="Whether this feature is included in your current plan">ℹ️</span>
                  </th>
                  <th scope="col" className="py-3 px-4 font-semibold">
                    Override
                    <span className="text-xs font-normal text-muted ml-1" title="Toggle to enable/disable feature. Enabling a feature not in your plan creates an override that may affect billing.">ℹ️</span>
                  </th>
                  <th scope="col" className="py-3 px-4 font-semibold">
                    Effective
                    <span className="text-xs font-normal text-muted ml-1" title="Final state after applying plan features and overrides">ℹ️</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((feature) => {
                  const isPending = pendingKey === feature.key;
                  const toggleDisabled = disabled || isPending;
                  const overrideLabel =
                    feature.overrideState === null
                      ? 'Inherited'
                      : feature.overrideState
                      ? 'Forced on'
                      : 'Forced off';

                  return (
                    <tr
                      key={feature.key}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 align-top">
                        <div className="font-semibold text-foreground">{feature.name}</div>
                        {feature.experimental ? (
                          <Badge tone="warning" className="mt-1">Experimental</Badge>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 align-top text-muted max-w-md">{feature.description}</td>
                      <td className="py-3 px-4 align-top">
                        <Badge tone={feature.inPlan ? 'success' : 'default'}>
                          {feature.inPlan ? 'Included' : 'Not included'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center gap-3">
                          <ToggleSwitch
                            checked={feature.overrideState ?? feature.effective}
                            disabled={toggleDisabled}
                            onChange={(value) => onToggle(feature.key, value)}
                          />
                          <span className="text-xs text-muted">{isPending ? 'Updating...' : overrideLabel}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <Badge tone={feature.effective ? 'success' : 'default'}>
                          {feature.effective ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
