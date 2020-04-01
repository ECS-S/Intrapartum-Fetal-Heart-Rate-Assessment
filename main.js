const input_file = document.getElementById("input_file");
const previewContainer = document.getElementById("image_preview");
const previewImage = previewContainer.querySelector(".image_preview_image");
const previewDefaultText = previewContainer.querySelector(".image_preview_text");

input_file.addEventListener("change",function(){
  var a = document.getElementById("week");
  // var week = a.options[a.selectedIndex].value;
  var week = a.selectedIndex;
  console.log(week);
  const imagefile = this.files[0];

  if(imagefile){
    const reader = new FileReader();

    previewDefaultText.style.display = "none";
    previewImage.style.display="block";

    reader.addEventListener("load", function(){
    previewImage.setAttribute("src", this.result)
    });
    reader.readAsDataURL(imagefile);

    // run script when file is loaded
    reader.onload = function() {
      let imgElement = document.querySelector('.image_preview_image');
      startProcess(imgElement, week, { DEBUG: false });
    }

  }else {
    previewDefaultText.style.display = null;
    previewImage.style.display = null;
    previewImage.setAttribute("src"," ")
  }
});
function onOpenCvReady() {
   console.log("opencv ready");
}
