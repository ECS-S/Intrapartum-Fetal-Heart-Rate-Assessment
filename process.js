var result;

function startProcess(imgElement, weekIndex, imgSize, options) {
  /*settings*/
  if (options) {
    var isDEBUG = options['DEBUG'];
  }

  /*input*/
  let img = cv.imread(imgElement);

  /*resize*/
  var resized = new cv.Mat();
  cv.resize(img, resized, new cv.Size(imgSize[1], imgSize[0]));
  img.delete();

  /*convert to hsv*/
  let hsv = new cv.Mat();
  cv.cvtColor(resized, hsv, cv.COLOR_RGB2HSV);

  /*mask out skin*/
  // skin tone masking
  let skin = new cv.Mat();
  let lower1 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [0, 10, 130, 0]);
  let upper1 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [30, 130, 255, 255]);
  let lower2 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [150, 10, 130, 0]);
  let upper2 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [180, 130, 255, 0]);
  let mask1 = new cv.Mat();
  cv.inRange(hsv, lower1, upper1, mask1);
  let mask2 = new cv.Mat();
  cv.inRange(hsv, lower2, upper2, mask2);
  let skinmask = new cv.Mat();
  cv.add(mask1,mask2, skinmask);
  // grind mask
  let kernelmask = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(11, 11));
  cv.erode(skinmask, skinmask, kernelmask, new cv.Point(-1, -1), 2);
  cv.dilate(skinmask, skinmask,kernelmask, new cv.Point(-1, -1), 2);
  let blurmask = new cv.Mat();
  cv.GaussianBlur(skinmask, blurmask, new cv.Size(3, 3), 0);
  // apply mask
  cv.bitwise_and(resized, resized, skin, blurmask);
  // cleaning
  lower1.delete(); lower2.delete(); upper1.delete(); upper2.delete();
  mask1.delete(); mask2.delete(); blurmask.delete();

  /*threshold image*/
  // convert to grey
  let grey = new cv.Mat();
  cv.cvtColor(skin, grey, cv.COLOR_RGB2GRAY);
  // apply threshold
  let threshed = new cv.Mat();
  cv.threshold(grey, threshed, 80, 255, cv.THRESH_BINARY)
  // grind threshold
  let kernelthreshed = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(11, 11));
  cv.erode(threshed, threshed, kernelthreshed, new cv.Point(-1, -1), 5);
  cv.dilate(threshed, threshed, kernelthreshed, new cv.Point(-1, -1), 5);
  let blurthreshed = new cv.Mat();
  cv.GaussianBlur(threshed, blurthreshed, new cv.Size(3, 3), 0);
  // cleaning
  grey.delete(); threshed.delete(); kernelthreshed.delete(); skin.delete();

  /*contours belly*/
  let contoured = new cv.Mat();
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();
  cv.findContours(blurthreshed, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_NONE);
  // cv.drawContours(resized, contours, -1, new cv.Scalar(0, 255, 0, 255), 3);
  // cleaning
  blurthreshed.delete(); hierarchy.delete();

  /*
  belly detection
  to proceed, the area of the belly must exceesd 40% of the image
  */
  // find largest contour
  if (contours.size() > 0) {
    var maxCntIndex = 0;
    let maxCnt = contours.get(maxCntIndex);
    var maxCntArea = cv.contourArea(maxCnt, false);
    for (let i = 0; i < contours.size(); ++i) {
      let cnt = contours.get(i);
      let area = cv.contourArea(cnt, false);
      if (maxCntArea < area) {
        maxCntIndex = i;
        maxCntArea = area;
      }
    }
    // cv.drawContours(resized, contours, maxCntIndex, new cv.Scalar(0, 255, 0, 255), 3);
  } else {
    console.log('no belly contours found.');
    let e = new Error('無法辨識肚子，請靠近一點');
    e.name = 'Bad Image Error';
    throw  e;
  }
  // polygon approximation
  let epsilon = 0.01*cv.arcLength(contours.get(maxCntIndex), true);
  let poly = new cv.MatVector();
  let hull = new cv.MatVector();
  let tmp = new cv.Mat();
  cv.approxPolyDP(contours.get(maxCntIndex), tmp, epsilon, true);
  poly.push_back(tmp);
  // cv.drawContours(resized, poly, -1, new cv.Scalar(0, 255, 0, 255), 3);
  // hull approximation
  cv.convexHull(contours.get(maxCntIndex), tmp, false, true);
  hull.push_back(tmp);
  // cv.drawContours(resized, hull, -1, new cv.Scalar(0, 255, 0, 255), 3);
  // check if minimum belly area is met
  let bellyPercentage = maxCntArea / (resized.rows*resized.cols);
  if (bellyPercentage < 0.4) {
    console.log('fail to meet minimum belly area.');
    let e = new Error('請靠近一點');
    e.name = 'Bad Image Error';
    throw e;
  }
  // cleaning
  contours.delete(); poly.delete(); tmp.delete();

  /*body parts labeling*/
  // find region of interest: bound min rect => bound max circle
  let rect = cv.boundingRect(hull.get(0));
  if (isDEBUG) {
    cv.rectangle(resized, new cv.Point(rect.x,rect.y)
      , new cv.Point(rect.x+rect.width,rect.y+rect.height)
      , new cv.Scalar(0,255,0, 255), 3);
  }
  let roi_cx = Math.round(rect.x + rect.width/2);
  let roi_cy = Math.round(rect.y + rect.height/2);
  let roi_rad = Math.round(Math.min(...[rect.width, rect.height])/2);
  if (isDEBUG) {
    cv.circle(resized, new cv.Point(roi_cx, roi_cy)
      , roi_rad, new cv.Scalar(0,255,0,255), 3);
  }
  // fit labels
  //...
  // find belly button: sharpen => canny => contours
  var rad = 60;
  let rectRoi = new cv.Rect(roi_cx-rad, roi_cy-rad, 2*rad, 2*rad);
  let roi = resized.roi(rectRoi);
  let blurRoi = new cv.Mat();
  cv.GaussianBlur(roi, blurRoi, new cv.Size(11, 11), 0);
  let sharpRoi = new cv.Mat();
  cv.addWeighted(roi, 3, blurRoi, -2, 0, sharpRoi);
  let edgeRoi = new cv.Mat();
  cv.Canny(sharpRoi, edgeRoi, 120, 255);
  let contoursRoi = new cv.MatVector();
  let hierarchyRoi = new cv.Mat();
  cv.findContours(edgeRoi, contoursRoi, hierarchyRoi, cv.RETR_CCOMP, cv.CHAIN_APPROX_NONE);
  if (contoursRoi.size() > 0) {
    var maxRoiCntIndex = 0;
    let maxRoiCnt = contoursRoi.get(maxRoiCntIndex);
    var maxRoiCntArea = cv.contourArea(maxRoiCnt, false);
    for (let i = 0; i < contoursRoi.size(); ++i) {
      let cnt = contoursRoi.get(i);
      let area = cv.contourArea(cnt, false);
      if (maxRoiCntArea < area) {
        maxRoiCntIndex = i;
        maxRoiCntArea = area;
      }
    }
    let M = cv.moments(contoursRoi.get(maxRoiCntIndex));
    var belly_cx = Math.round(M.m10/M.m00) + roi_cx - rad;
    var belly_cy = Math.round(M.m01/M.m00) + roi_cy - rad;
    cv.circle(resized, new cv.Point(belly_cx, belly_cy)
      , 10, new cv.Scalar(255,0,0,255), -1);
  } else {
    console.log('no belly button found');
    let e = new Error('無法辨識肚臍');
    e.name = 'Bad Image Error';
    throw e;
  }
  // cleaning
  hull.delete(); roi.delete(); blurRoi.delete();
  sharpRoi.delete(); edgeRoi.delete(); contoursRoi.delete(); hierarchyRoi.delete();

  /*heartbeat tracking*/
  // alignment
  var bot_x = roi_cx;
  var bot_y = roi_cy + roi_rad;
  if (isDEBUG) {
    cv.line(resized, new cv.Point(bot_x, bot_y)
      , new cv.Point(belly_cx, belly_cy), new cv.Scalar(255,255,0,255), 3);
  }
  // track heartbeat
  function drawArea(image, scale, ellipse_ratio, rad_ratio) {
    let d_x = bot_x - belly_cx;
    let d_y = bot_y - belly_cy;
    let new_x = belly_cx + Math.round(d_x*scale);
    let new_y = belly_cy + Math.round(d_y*scale);
    let rad_x = Math.round(roi_rad*rad_ratio);
    let rad_y = Math.round(rad_x*ellipse_ratio);
    cv.ellipse(image, new cv.Point(new_x, new_y), new cv.Size(rad_y, rad_x)
      , 0, 0, 360, new cv.Scalar(255,0,255, 255), 3);
  }
  duration = ['8 week', '12 week', '18 week','24 week', '30 week', '35 week', '36 week'];
  durRatios = [[9/10, 1, 1/5], [1/2, 2, 1/5], [2/5, 2.5, 1/5], [1/8, 2, 1/4]
    , [-1/10, 2, 1/3], [-3/10, 2, 2/5], [2/5, 1.5, 1/4]];
  let dur = durRatios[weekIndex];
  drawArea(resized, dur[0], dur[1], dur[2]);

  /*show the output*/
  cv.imshow('canvasOutput', resized);
  result = resized;
}

function resizeOutput(h, w) {
  let changed = new cv.Mat();
  cv.resize(result, changed, new cv.Size(w, h));
  cv.imshow('canvasOutput', changed);
  changed.delete();
}
