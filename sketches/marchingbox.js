import math from 'canvas-sketch-util/math';

export { findIsobar };

// If an isobar as defined by function, fn, intersects the box
// return the points on the isobar intersecting the box
// perimeter.  The points are returns in order that the higher
// values in the field are to the RIGHT.
// (return null if no isobar intersecting the box).
// In the case of a saddle point, two sets of points are
// returned.
function findIsobar(box, fn, value) {
    // Convert xLeft, yTop, xRight, yBottom box array
    // to ul, ur, lr, ll - x/y coordinates.
    const pointOrder = [0, 1, 2, 1, 2, 3, 0, 3];
    let points = [];
    for (let i = 0; i < pointOrder.length; i += 2) {
        points.push([box[pointOrder[i]], box[pointOrder[i + 1]]]);
    }

    let values = [];
    for (let i = 0; i < points.length; i++) {
        values[i] = fn(points[i][0], points[i][1]);
    }

    let above = [];
    for (let i = 0; i < 4; i++) {
        above[i] = values[i] >= value;
    }

    // On each transition from Above to Below value
    // that side will the starting point of the directed
    // isobar.  Below to Above transitions are the ending
    // point of the isobar segment.
    let fromSides = [];
    let toSides = [];
    for (let i = 0; i < 4; i++) {
        if (above[i] !== above[(i+1) % 4]) {
            if (above[i]) {
                fromSides.push(i);
            } else {
                toSides.push(i);
            }
        }
    }

    // Possible lengths of fromSides and toSides are
    // 0/0, 1/1, and 2/2
    if (fromSides.length === 0) {
        return null;
    }

    // Simple isobar (single)
    if (fromSides.length == 1) {
        return [isoPoint(fromSides[0]), isoPoint(toSides[0])];
    }

    // Saddle point!
    let center = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
    let centerValue = fn(center[0], center[1]);
    let centerAbove = centerValue >= value;

    if (centerAbove) {
        return [
            isoPoint(fromSides[0]), isoPoint(toSides[0]),
            isoPoint(fromSides[1]), isoPoint(toSides[1])
        ];
    }
    
    return [
        isoPoint(fromSides[0]), isoPoint(toSides[1]),
        isoPoint(fromSides[1]) ,isoPoint(toSides[0]),
    ];

    function isoPoint(side) {
        let whole = values[(side + 1) % 4] - values[side];
        let fraction = (value - values[side]) / whole;
        let p0 = points[side];
        let p1 = points[(side + 1) % 4];
        return [math.lerp(p0[0], p1[0], fraction),
                math.lerp(p0[1], p1[1], fraction)];
    }
}