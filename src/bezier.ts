import { Vec } from "./vec";

export namespace bezier {
	export function q(cp: [Vec, Vec, Vec, Vec], t: number): Vec {
		const tx = 1 - t,
			[a, b, c, d] = cp,
			pa = a.scale(tx * tx * tx),
			pb = b.scale(3 * tx * tx * t),
			pc = c.scale(3 * tx * t * t),
			pd = d.scale(t * t * t);
		return Vec.add(
			Vec.add(pa, pb),
			Vec.add(pc, pd),
		);
	}

	export function qprime(cp: [Vec, Vec, Vec, Vec], t: number): Vec {
		const tx = 1 - t,
			pa = Vec.sub(cp[1], cp[0]).scale(3 * tx * tx),
			pb = Vec.sub(cp[2], cp[1]).scale(6 * tx * t),
			pc = Vec.sub(cp[3], cp[2]).scale(3 * t * t);
		return Vec.add(Vec.add(pa, pb), pc);
	}

	export function qprimeprime(cp: [Vec, Vec, Vec, Vec], t: number): Vec {
		return Vec.add(
			Vec.add(
				Vec.sub(cp[2], cp[1].scale(2)),
				cp[0]
			).scale(6 * (1 - t)),
			Vec.add(
				Vec.sub(cp[3], cp[2].scale(2)),
				cp[1]
			).scale(6 * t)
		);
	}
}