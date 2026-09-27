// Every menu item carries a signed delivery weight. The sign says how the item
// counts towards the extra delivery charge, the magnitude says by how much:
//
//    1 — normal, one unit per qty
//    2 — heavy, one qty is two units
//   -2 — light, two qty count as one unit
//
// Items that predate the field, or carry a zero/unparseable value, are normal.
export const getItemWeight = (item) => {
    const weight = parseInt(item?.weight);
    return Number.isFinite(weight) && weight !== 0 ? weight : 1;
};

export const isLightItem = (item) => getItemWeight(item) < 0;
export const isHeavyItem = (item) => getItemWeight(item) > 1;
