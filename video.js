const input_file = document.getElementById("input_file");
const week_options = document.getElementById("week");
var current_week = 1;
const previewContainer = document.getElementById("image_preview");
const canvas = document.getElementById('canvasOutput');
const label1 = document.getElementById('label-before');
const label2 = document.getElementById('label-after');
var isProcessed = false;


function estimate(src, ignoreAlert, args) {
  try {
    if (args && args.height && args.width) {
      startProcess(src, current_week - 1, [args.height, args.width], { DEBUG: true });
    }else {
      startProcess(src, current_week - 1, [360, 480], { DEBUG: true });
    }
    label1.innerHTML = '原圖';
    label2.innerHTML = '預估';
    if (ignoreAlert) {
      document.querySelector('.status').innerHTML = '結果';
    }
    return true;
  } catch (e) {
    if (e.name === 'Bad Image Error') {
      if (!ignoreAlert) {
        Swal.fire({
          title: '注意!',
          text: e.message,
          icon: 'error'
        });
      } else {
        document.querySelector('.status').innerHTML = e.message;
      }
      return false;
    } else {
      if (!ignoreAlert) {
        Swal.fire({
          title:  '注意!',
          text: '無法辨識!',
          icon: 'error'
        });
      } else {
        console.log(e);
        document.querySelector('.status').innerHTML = '無法辨識';
      }
      return false;
    }
    console.log(e);
  }
}

function optionChanged() {
  // read week
  let week = $(".slider").slider('values', 0) + 1;
  current_week = week;
}

function onOpenCvReady() {
   console.log("opencv ready");
}

function captureVideo() {
  // check week
  if (current_week == 0) {
    console.log('Week not selected.');
    Swal.fire({
      title:  '注意!',
      text: '請先選擇懷孕週期!',
      icon: 'error'
    });
    streaming = false;
    return;
  }
  streaming = true;
  // show canvas, hide placeholder
  document.getElementById('canvasOutput').classList.remove('invisible');
  document.getElementById('placeholderVideo').classList.add('invisible');
  // video tag
  // let video = document.getElementById("videoInput"); // video is the id of video tag
  navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(function(stream) {
          let realH = stream.getVideoTracks()[0].getSettings().height;
          let realW = stream.getVideoTracks()[0].getSettings().width;
          let realRatio = stream.getVideoTracks()[0].getSettings().aspectRatio;

          // create video element
          let pvImg = document.getElementById('placeholderVideo');
          let video = document.createElement('video');
          video.width = realW;
          video.height = realH;
          video.classList.add('videoCapture');
          document.querySelector('.panel-body').appendChild(video);

          video.srcObject = stream;
          video.play();
          console.log(`${realH} : ${realW}`); // real cam size

          // opencv canvas
          console.log();
          let src = new cv.Mat(realH, realW, cv.CV_8UC4);
          let dst = new cv.Mat(realH, realW, cv.CV_8UC1);
          let cap = new cv.VideoCapture(video);

          const FPS = 60;
          function processVideo() {
              try {
                  if (!streaming) {
                      // clean and stop.
                      src.delete();
                      return;
                  }
                  let begin = Date.now();
                  // start processing.
                  cap.read(src);
                  // estimation
                  let styleWidth = Math.round(document.querySelector('.panel-body').offsetWidth ) - 30;
                  let styleHeight = Math.round(styleWidth / realRatio);
                  console.log(`NEW: ${styleWidth} : ${styleHeight}`);
                  let status = estimate(src.clone(), true, { height: styleHeight, width: styleWidth });
                  if (!status) {
                    resizeInput(src.clone(), styleHeight, styleWidth);
                  }
                  // schedule the next one.
                  let delay = 1000/FPS - (Date.now() - begin);
                  setTimeout(processVideo, delay);
              } catch (err) {
                  console.log(err);
              }
          }

          // schedule the first one.
          setTimeout(processVideo, 0);

      })
      .catch(function(err) {
          console.log("An error occurred! " + err);
      });
}
