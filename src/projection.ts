import { Rect } from "./rect";
import { Vec } from "./vec";

type Projection = (v: Vec) => Vec;

/**
 * Create a function that projects points proportionally from one rectangle to another.
 * 
 * @param Rect fr 
 * @param Rect to 
 * @returns Projection
 */
export function project(
	fr: Rect,
	to: Rect,
): Projection {
	return (v: Vec) => {
		return Vec.add(
			Vec.mul(
				Vec.sub(v, fr.origin()),
				Vec.div(to.size(), fr.size())
			),
			to.origin()
		);
	};
}
