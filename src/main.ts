import './style.scss'

import { fit } from './fit_curve';
import { testUsing } from './testing';

async function main() {
  const v = await testUsing(
    document.querySelector('#tests') as HTMLElement,
    './tests.json',
    fit
  );

  // TODO(knorton): Update header
  console.log(v);
}

main();

