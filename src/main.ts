import './style.scss'

import { fit } from './fit_curve';
import { testUsing } from './testing';
import { Iter } from './iter';

async function main() {
  const results = await testUsing(
    document.querySelector('#tests') as HTMLElement,
    // Test results were generated from the original Graphics Gem
    // C code. I have no idea what I did with that code tho.
    './tests.json',
    fit
  );

  const header = document.querySelector('header') as HTMLElement,
    failed = Iter.of(results).filter(r => !r.passed).count(),
    errored = Iter.of(results).filter(r => r.errored).count(),
    total = results.length;

  header.innerText = `${total.toLocaleString()} tests, ${failed.toLocaleString()} failed, ${errored.toLocaleString()} errored.`
}

main();

