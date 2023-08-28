import './style.scss'

import { fit } from './fit_curve';
import { testUsing } from './testing';

async function main() {
  const v = await testUsing(
    document.querySelector('#tests') as HTMLElement,
    // Test results were generated from the original Graphics Gem
    // C code. I have no idea what I did with that code tho.
    './tests.json',
    fit
  );

  // TODO(knorton): Update header
  console.log(v);
}

main();

