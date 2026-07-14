import type { ReactElement } from 'react';

import type { JsonLdObject } from '../../lib/seo/structured-data';

export interface JsonLdProps {
  readonly data: JsonLdObject | readonly JsonLdObject[];
}

/**
 * Renders a schema.org JSON-LD block. `<` is escaped so a translated string can
 * never break out of the `<script>` element.
 */
export function JsonLd({ data }: JsonLdProps): ReactElement {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
