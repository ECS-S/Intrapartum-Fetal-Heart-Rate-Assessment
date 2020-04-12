const input_file = document.getElementById("input_file");
var current_week = 1;
const previewContainer = document.getElementById("image_preview");
const previewImage = previewContainer.querySelector(".image_preview_image");
const canvas = document.getElementById('canvasOutput');
const label1 = document.getElementById('label-before');
const label2 = document.getElementById('label-after');
var isProcessed = false;
const fileTypes = ['jpg', 'jpeg', 'png'];


input_file.addEventListener("change",function(){
  // check week
  if (current_week == 0) {
    console.log('Week not selected.');
    Swal.fire({
      title:  '注意!',
      text: '請先選擇懷孕週期!',
      icon: 'error'
    });
    return;
  }

  // check file type
  const imagefile = this.files[0];
  if (fileTypes.indexOf(imagefile.name.split('.').pop().toLowerCase()) === -1) {
    console.log('unsupported format');
    Swal.fire({
      title:  '注意!',
      text: '檔案格式錯誤!',
      icon: 'error'
    });
    return;
  }

  // upload image
  if(imagefile){
    const reader = new FileReader();
    previewImage.style.display="block";
    // show image
    reader.addEventListener("load", function(){
      previewImage.setAttribute("src", this.result);
      let canvasElement = document.getElementById('canvasOutput');
    });
    reader.readAsDataURL(imagefile);
    // run script when file is loaded
    reader.onload = function() {
      let img = cv.imread(previewImage);
      estimate(img, false);
      isProcessed = true;
    }
  }else {
    resetImage();
    isProcessed = false;
  }
});

window.addEventListener("resize", function(){
  resizeImage();
});

function resetFile() {
  input_file.value = '';
}

function resetImage() {
  // default images
  previewImage.setAttribute("src","./sample/sample_before.jpg");
  let defImg = new Image();
  defImg.onload = function() {
    canvas.height = previewImage.height;
    canvas.width = previewImage.width;
    canvas.getContext('2d').drawImage(defImg, 0, 0, previewImage.width, previewImage.height);
  }
  defImg.src = './sample/sample_after.jpg'

  // default label
  label1.innerHTML = '原圖(範例)';
  label2.innerHTML = '預估(範例)';
}

function resizeImage() {
  if (isProcessed) {
    resizeOutput(previewImage.height, previewImage.width);
  } else {
    resetImage();
  }
}

function estimate(src, ignoreAlert) {
  try {
    startProcess(src, current_week - 1, [previewImage.height, previewImage.width], { DEBUG: true });
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
  if (isProcessed) {
    let img = cv.imread(previewImage);
    estimate(img, false);
  }
}

function onOpenCvReady() {
   console.log("opencv ready");
}

function captureVideo() {
  streaming = true;
  // video tag
  let video = document.getElementById("videoInput"); // video is the id of video tag
  navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(function(stream) {
          video.srcObject = stream;
          video.play();
      })
      .catch(function(err) {
          console.log("An error occurred! " + err);
      });

  // opencv canvas
  let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
  let dst = new cv.Mat(video.height, video.width, cv.CV_8UC1);
  let cap = new cv.VideoCapture(video);

  const FPS = 15;
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
          let status = estimate(src.clone(), true);
          if (!status) {
            cv.imshow('canvasOutput', src);
          }
          // schedule the next one.
          let delay = 1000/FPS - (Date.now() - begin);
          setTimeout(processVideo, delay);
      } catch (err) {
          console.log(err);
      }
  };

  // schedule the first one.
  setTimeout(processVideo, 0);
}

resetImage();
