import type { ReactNode } from 'react';
import { Paper, Typography } from '@mui/material';

export function SummaryCard({
  title,
  value,
  description,
  compact = false,
}: {
  title: string;
  value: ReactNode;
  description?: string;
  compact?: boolean;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, minWidth: 0 }}>
      <Typography component="h2" variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography
        sx={{
          mt: 1.25,
          fontSize: compact ? 18 : 32,
          fontWeight: 700,
          lineHeight: 1.2,
          fontVariantNumeric: 'tabular-nums',
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </Typography>
      {description && (
        <Typography component="p" variant="caption" color="text.secondary" sx={{ mt: 1.25 }}>
          {description}
        </Typography>
      )}
    </Paper>
  );
}
