const input_file = document.getElementById("input_file");
const week_options = document.getElementById("week");
var current_week = 0;
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
    Swal.fire(
      '注意!',
      '請先選擇懷孕週期!',
      'error'
    )
    return;
  }

  // check file type
  const imagefile = this.files[0];
  if (fileTypes.indexOf(imagefile.name.split('.').pop().toLowerCase()) === -1) {
    console.log('unsupported format');
    Swal.fire(
      '注意!',
      '檔案格式錯誤!',
      'error'
    )
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
      estimate();
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

function estimate() {
  try {
    startProcess(previewImage, current_week - 1, [previewImage.height, previewImage.width], { DEBUG: false });
    label1.innerHTML = '原圖';
    label2.innerHTML = '預估';
  } catch (e) {
    if (e.name === 'Bad Image Error') {
      Swal.fire(
        '注意!',
        e.massage ,
        'error'
      )
    } else {
      Swal.fire(
        '注意!',
        '無法辨識!',
        'error'
      )
    }
  }
}

function optionChanged() {
  // read week
  var week = week_options.selectedIndex;
  current_week = week;
  if (isProcessed) {
    estimate();
  }
  Swal.fire(
    '注意!',
    week_options.selectedIndex ,
    'error'
  )
}

function onOpenCvReady() {
   console.log("opencv ready");
}

resetImage();
