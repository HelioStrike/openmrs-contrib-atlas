$(function () {
  $('#create-capture').click(function () {
    var lat = map.getCenter().lat();
    var lng = map.getCenter().lng();
    var zoom = map.getZoom();
    var url = "capture?legend=" + legendGroups + "&zoom="
     + zoom + "&lat=" + lat + "&lng=" + lng ;
     console.log(url);
    window.location = url ;
  });
});

function initDownloadButton() {
  $("#download").mouseover(function(){
    $("#screen").css("display", "block");
  });
  $("#download").mouseleave(function(){
    $("#screen").css("display", "none");
  });
  $("#1024x768, #1280x1024, #3840x2160").click(function(){
    $("#screen").css("display", "none");
  });
  $('#1024x768').click(function () {
    var url = "download?legend=" + legendGroups + "&size=1024x768" + "&fade=" + fadeOverTime;
    window.location = url ;
  });
  $('#1280x1024').click(function () {
    var url = "download?legend=" + legendGroups + "&size=1920x1080" + "&fade=" + fadeOverTime;
    window.location = url ;
  });
  $('#3840x2160').click(function () {
    var url = "download?legend=" + legendGroups + "&size=3840x2160" + "&fade=" + fadeOverTime;
    window.location = url ;
  });
  
}