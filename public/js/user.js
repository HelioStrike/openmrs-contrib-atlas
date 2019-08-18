function initLoginButton() {
  $("#login").mouseover(function(){
    $("#logout").css("display", "block");
  });
  $("#login").mouseleave(function(){
    $("#logout").css("display", "none");
  });
  $("#editSite, #newSite, #locateMe").click(function(){
    //legendGroups = 2;
    //repaintMarkers();
    initLegend();
    if ($(this).attr("id") === "locateMe")
      locateMe();
    if ($(this).attr("id") === "editSite") {
      getMarkerPosition(nextSite, function (result) {
        //increments nextSite, and loops back to 0 when nextSite is equal to auth_site.length 
        fadeOverTime = false;
        closeBubbles();
        repaintMarkers();
        document.getElementById("fadeCheckbox").checked = false;
        sites[auth_site[nextSite]].infowindow.open(map, sites[auth_site[nextSite]].marker);
        sites[auth_site[nextSite]].bubbleOpen = true;
        nextSite = (nextSite+1)%auth_site.length;
        map.setCenter(result);
        map.setZoom(8);
      });
    }
    if ($(this).attr("id") === "newSite")
      var marker = createSite();
  });
}

$(function () {
  $("#map_canvas").on("submit", "form", (function(e) {
    saveMarker(e);
  }));
  $("#map_canvas").on("click", "#delete", function(e){
    e.preventDefault();
    var id = $(this).attr("value");
    bootbox.confirm("Are you sure ? Your site will be deleted", function(result) {
      if (result) deleteMarker(id);
    });
  });
  $("#map_canvas").on("click", "#update", function(e){
    var id = $(this).attr("value");
    updateMarker(id);
  });
  $("#map_canvas").on("click", "#addcoowner", function(e){
    addCoOwner(e);
  });
  $("#map_canvas").on("click", "#removecoowner", function(e){
    removeCoOwner(e);
  });
  $("#map_canvas").on("click", "#adv-button", function(e){
    showAdvancedOptions = !showAdvancedOptions;
    displayAdvancedOptions(e);
  });
});

function getGeolocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      myPosition = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      $("#atlas-hidden-longitude").val(position.coords.longitude);
      $("#atlas-hidden-latitude").val(position.coords.latitude);
      map.setCenter(myPosition);
      map.setZoom(10);
      return;
    }, handle_errors);
  } else {
    yqlgeo.get("visitor", function(position) {
      if (response.error) {
        var error = { code: 0 };
        handle_error(error);
        return;
      }
      myPosition = new google.maps.LatLng(position.place.centroid.latitude,
          position.place.centroid.longitude);
      map.setCenter(myPosition);
      map.setZoom(10);
      return;
    });
  }
}

function handle_errors(error) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      alert("User did not share geolocation data");
      break;
    case error.POSITION_UNAVAILABLE:
      alert("Could not detect current position");
      break;
    case error.TIMEOUT: alert("Retrieving position timeout");
      break;
    default: alert("Unknown error");
      break;
  }
}

function locateMe()  {
  getGeolocation();
}

function getMarkerPosition(nextSite, callback)  {
  var ids = Object.keys(sites);
  for(var i = 0; i < ids.length; i++) {
    if (sites[ids[i]].siteData.id == auth_site[nextSite]){
      callback(sites[ids[i]].marker.getPosition());
    }
  }
  return null;
}

function resetFadeGroups() {
  Object.keys(sites).forEach(function(id) {
    var site = sites[id];
    site.fadeGroup = getFadeGroup(site.siteData);
  });
  repaintMarkers();
}

function focusMarker(id) {
  if(sites[id].fadeGroup > 3) {
    $("#fadeCheckbox").click();  
  }
  sites[id].infowindow.open(map, sites[id].marker);
  sites[id].bubbleOpen = true;
  map.setZoom(8);
  map.setCenter(sites[id].marker.getPosition());    
}

function createSite() {
  closeBubbles();
  myPosition = map.getCenter();
  var image = {
    url: "https://maps.google.com/intl/en_us/mapfiles/ms/micons/blue-dot.png",
    scaledSize: new google.maps.Size(32, 32)
  };
  var marker = new google.maps.Marker({
    position: myPosition,
    map: map,
    title: "New",
    icon: image,
    draggable: false,
    animation: google.maps.Animation.DROP,
    optimized: false
  });
  marker.setDraggable(true);
  var site = newSite(myPosition);
  var fadeGroup = getFadeGroup(site);
  var infowindow = createInfoWindow(site, marker);
  var editwindow = createEditInfoWindow(site, marker);
  sites[site.id] = {"siteData": site, "marker":marker, "infowindow":infowindow, "editwindow":editwindow, "bubbleOpen":false,"editBubbleOpen":false, "fadeGroup":fadeGroup};
  return marker;
}

function getCurrentLatLng() {
  var lng = $("#atlas-hidden-longitude").val();
  var lat = $("#atlas-hidden-latitude").val();
  if ( lng !== "" && lat !== "" ){
    return new google.maps.LatLng(lat, lng);
  } else {
    return map.getCenter();
  }
}

function newSite(myPosition) {
  var site = {
    id: sites.length,
    uuid: null,
    contact: userName,
    created_by: currentUser,
    name: userName + " Site",
    patients: 0,
    encounters: 0,
    observations: 0,
    email: userEmail,
    show_counts: 1,
    notes: "",
    openmrs_version: "",
    url: "",
    image: "",
    latitude: myPosition.lat(),
    longitude: myPosition.lng(),
    type:  "TBD",
    date_changed: new Date().toDateString(),
    date_created: new Date().toDateString(),
    auth: [],
    coowners: []
  };
  if (moduleHasSite !== 1 && moduleUUID !== null)
    site.module = 1;
  return site;
}

function deleteMarker(site) {
  if(!isValidMarkerId(site)) {
    sites[site].marker.setMap(null);
    return;
  }
  var deleted = site;
  if  (deleted !== "" && deleted !== null) {
    $.ajax({
      url: "/api/marker/"+deleted,
      type: "DELETE",
      dataType: "json",
    })
        .done(function(response) {
          sites[site].marker.setMap(null);
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
          bootbox.alert({ message: "Error deleting your marker - Please try again ! - " + (jqXHR.responseJSON.message? jqXHR.responseJSON.message: jqXHR.statusText) , backdrop: true });
          return;
        });
  } else {
    sites[site].marker.setMap(null);
  }
  nextSite = 0;
  if (sites[site].siteData.module === 1) {
    moduleHasSite = 0;
  }
  if (moduleUUID !== null && window !== window.top) {
    parent.postMessage("update", "*");
  }
  var i = auth_site.indexOf(sites[site].siteData.uuid);
  if(i !== -1) {
    auth_site.splice(i, 1);
  }
  i = sites.indexOf(site);
  if(i !== -1) {
    sites.splice(i, 1);
  }
  if (auth_site.length === 0)
    $("#editSite").attr("hidden", true);
}

function createEditInfoWindow(site, marker) {
  var html = contentEditwindow(site);
  var infowindow = new google.maps.InfoWindow({
    content: html,
    maxWidth: 300
  });
  google.maps.event.addListener(infowindow, "closeclick", function() {
    sites[site.id].editBubbleOpen = false;
  });
  if (canUpdate(site) || (site.uuid) !== null) {
    $("#map_canvas").on("click", "#undo", function(e){
      e.preventDefault();
      var id = $(this).attr("value");
      var site = sites[id].siteData;
      sites[id].marker.setDraggable(false);
      sites[id].marker.setPosition(new google.maps.LatLng(site.latitude, site.longitude));
      sites[id].editBubbleOpen = false;
      sites[id].editwindow.close();
    });
  }
  return infowindow;
}

function isValidMarkerId(markerId) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(markerId);  
}

function readImage(file) {
  var id = $("#site").val();
  var input = file.target;
  var reader = new FileReader();
  var fileDetails = input.files[0];
  reader.readAsDataURL(fileDetails);

  reader.onload = function(){
    sites[id].siteData.image = reader.result;
    var imageErrorElem = document.getElementById('image-error');
    if(fileDetails.type !== "image/jpg" && fileDetails.type !== "image/jpeg" && fileDetails.type !== "image/png") {
      imageError = true;
      imageErrorElem.innerHTML = "Please select a png/jpg/jpeg";
      imageErrorElem.style.display = "block";
    } else if(sites[id].siteData.image.length > maxImageUploadSize*4/3) {
      imageError = true;
      imageErrorElem.innerHTML = "Please select an image less than " + Math.round(maxImageUploadSize/1024) + " kb in size";
      imageErrorElem.style.display = "block";
    } else {
      imageError = false;
      imageErrorElem.style.display = "none";
    }
  };
};

function saveMarker(e) {
  e.preventDefault();
  if(imageError) {
    return;
  }
  var id = $("#site").val();
  var site = sites[id].siteData;
  if (moduleUUID === null || site.module !== 1) {
    var patients = $("#patients").val().trim();
    var encounters = $("#encounters").val().trim();
    var obs = $("#observations").val().trim();
    if(patients==='') patients=0;
    if(encounters==='') encounters=0;
    if(obs==='') obs=0;
    var version = $("select#version").val().trim();
    site.distribution = getSelectedDistributionValue();
    site.nonStandardDistributionName = $("#nonStandardDistributionName").val().trim();
    site.observations = obs;
    site.patients = patients;
    site.encounters = encounters;
    site.openmrs_version = version;
  }
  if (site.module == 1) {
    var stats = $('#include-count').is(':checked') ? 1 : 0;
    site.show_counts = stats;
  }
  
  var image = sites[id].siteData.image;
  var name = $("#name").val().trim();
  var mail = $("#email").val().trim();
  var notes = $("#notes").val().trim();
  var contact =$("#contact").val().trim();
  var url  = $("#url").val().trim();
  var type = $("select#type").val().trim();
  if(name === "" || id === "") {
    bootbox.alert({ message: "Site Name is missing !", backdrop: true });
  } else {
    var pos = sites[id].marker.getPosition();
    site.name = name;
    site.email =  mail;
    site.url = url;
    site.contact = contact;
    site.notes = notes;
    site.image = image;
    site.type = type;
    site.longitude = pos.lng();
    site.latitude = pos.lat();
    sites[id].siteData = site;
    sites[id].fadeGroup = getFadeGroup(site);
    sites[id].editwindow.close();
    sites[id].editBubbleOpen = false;
    sites[id].marker.setDraggable(false);
    var json = JSON.stringify(site);
    var isUpdateRequest = isValidMarkerId(id);
    $.ajax({
      //If marker id is a uuid, its an PATCH update request to '/marker/[id]'
      //else it is an POST create request to '/marker'
      url: "/api/marker" + (isUpdateRequest ? "/"+id : ""),
      type: isUpdateRequest?"PATCH":"POST",
      data: json,
      dataType: "json",
      processData: false,
      contentType: "application/json",
    })
        .done(function(response) {
          var nid = response.id;
          if(!isUpdateRequest) {
            site.id = nid;
            site.date_created = response.date_created;
            sites[nid] = sites[id];
            sites[nid].siteData = response;
            delete sites[id];
          }
          sites[nid].siteData.openmrs_version = response.openmrs_version;
          sites[nid].siteData.date_changed = response.date_changed;
          sites[nid].siteData.image_url = response.image_url;
          delete sites[nid].siteData.image;
          sites[nid].fadeGroup = 0;
          
          sites[nid].infowindow.setContent(contentInfowindow(sites[nid].siteData));
          sites[nid].editwindow.setContent(contentEditwindow(sites[nid].siteData));

          if (moduleUUID !== null && moduleHasSite === 0) {
            site.module = 1;
            moduleHasSite = 1;
          }
          if (moduleUUID !== null && site.module === 1) {
            parent.postMessage("save", "*");
          }

          if (auth_site.indexOf(nid) === -1)
            auth_site.push(nid);
          if (auth_site.length > 0)
            $("#editSite").attr("hidden", false);

          repaintMarkers();
          initLegend();
          
          if (site.distribution == null && (site.nonStandardDistributionName != null && site.nonStandardDistributionName != "")) {
            fetchDistributions()
                .done(function () {
                  site.distribution = getDistributionByName(site.nonStandardDistributionName).id;
                })
                .always(function () {
                  sites[id].infowindow.setContent(contentInfowindow(site));
                });
          }

        })
        .fail(function(jqXHR, textStatus, errorThrown) {
          bootbox.alert({ message: "Error saving your marker - Please try again ! - " + (jqXHR.responseJSON.message? jqXHR.responseJSON.message: jqXHR.statusText) , backdrop: true });
        });
  }
  return false;
}

function updateMarker(id) {
    var json = JSON.stringify({ });
    $.ajax({
      url: "/api/marker/"+id,
      type: "PATCH",
      data: json,
      dataType: "json",
      processData: false,
      contentType: "application/json",
    })
        .done(function(response) {
          sites[id].siteData.date_changed = response.date_changed;
          sites[id].siteData.image = sites[id].siteData.image;
          sites[id].infowindow.setContent(contentInfowindow(sites[id].siteData));
          sites[id].fadeGroup = 0;
          repaintMarkers();
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
          bootbox.alert({ message: "Error updating your marker - Please try again ! - " + (jqXHR.responseJSON.message? jqXHR.responseJSON.message: jqXHR.statusText), backdrop: true });
        });
}

function addCoOwner(e) {
  e.preventDefault();
  var atlas_id = $("#site").val();
  var principal = $("#coowner").val();
  var json = JSON.stringify({
    atlas_id: atlas_id,
    principal: principal,
    token: null,
    privileges: "UPDATE",
    expires: null
  });
  $.ajax({
    url: "/api/auth",
    type: "POST",
    data: json,
    dataType: "json",
    processData: false,
    contentType: "application/json",
  })
      .done(function(response) {
        sites[atlas_id].siteData.auth.push(response); 
        sites[atlas_id].siteData.coowners.push(response.principal); 
        sites[atlas_id].infowindow.setContent(contentInfowindow(sites[atlas_id].siteData));
        sites[atlas_id].editwindow.setContent(contentEditwindow(sites[atlas_id].siteData));
        displayAdvancedOptions(e);
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        bootbox.alert({ message: "Unable to add " + principal + " as a co-owner : " + (jqXHR.responseJSON.message?jqXHR.responseJSON.message:jqXHR.statusText), backdrop: true });
      });
}

function removeCoOwner(e) {
  e.preventDefault();
  var id = $("#removecoowner").val();
  var atlas_id = $("#site").val();
  
  $.ajax({
    url: "/api/auth/" + id,
    type: "DELETE",
    dataType: "json",
  })
      .done(function(response) {
        var authElem = sites[atlas_id].siteData.auth.find(function(rule) { return rule.id === id; });
        var idx = sites[atlas_id].siteData.auth.indexOf(authElem);
        sites[atlas_id].siteData.auth.splice(idx, 1);
        sites[atlas_id].siteData.coowners.splice(idx, 1);
        sites[atlas_id].infowindow.setContent(contentInfowindow(sites[atlas_id].siteData));
        sites[atlas_id].editwindow.setContent(contentEditwindow(sites[atlas_id].siteData));
        displayAdvancedOptions(e);
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        bootbox.alert({ message: "Error removing Co-owner - Please try again ! - " + (jqXHR.responseJSON.message?jqXHR.responseJSON.message:jqXHR.statusText), backdrop: true });
      });
}

function subscribeUser() {
  $.ajax({
    url: "/api/unsubscribed",
    type: "DELETE",
    dataType: "json",
  })
      .done(function(response) {
        bootbox.alert({ message: "Subscribed for marker updates!", backdrop: true });
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        bootbox.alert({ message: "Error subscribing for marker updates - Please try again ! - " + (jqXHR.responseJSON.message? jqXHR.responseJSON.message: jqXHR.statusText), backdrop: true });
      });
}

function unsubscribeUser() {
  $.ajax({
    url: "/api/unsubscribed",
    type: "POST",
    dataType: "json",
  })
      .done(function(response) {
        bootbox.alert({ message: "Unsubscribed for marker updates!", backdrop: true });
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        bootbox.alert({ message: "Error Unsubscribing for marker updates - Please try again ! - " + (jqXHR.responseJSON.message? jqXHR.responseJSON.message: jqXHR.statusText), backdrop: true });
      });
}


function displayAdvancedOptions(e) {
  var advOptions = document.getElementById('adv-options');
  var advIcon = document.getElementById('adv-icon');
  if(showAdvancedOptions) {
    advOptions.style.display = "block";
    advIcon.classList.remove('glyphicon-chevron-down');
    advIcon.classList.add('glyphicon-chevron-up');
  } else {
    advOptions.style.display = "none";
    advIcon.classList.remove('glyphicon-chevron-up');
    advIcon.classList.add('glyphicon-chevron-down');
  }
}

function checkCoOwnerInput(e) {
  var coOwnerInput = document.getElementById('coowner');
  var coOwnerButton = document.getElementById('addcoowner');
  if(coOwnerInput.value === '') {
    coOwnerButton.disabled = true;
  } else {
    coOwnerButton.disabled = false;
  }
}

function contentInfowindow(site) {
  var html = "<div class='site-bubble'>";
  html += "<div class='site-name'>" + site.name + "</div>";
  if(site.image_url && site.image_url !== "") {
    html += "<img class='site-image' src='" + site.image_url + "?t=" + new Date().getTime() + "' width='80px' height='80px' alt='thumbnail' />";
  }
  html += "<div class='site-panel'>";
  if (site.url)
    html += "<div class='site-url'><a target='_blank' rel='nofollow' href='" + safeUrl(site.url) + "' title='" + site.url + "'>"
        + displayUrl(safeUrl(site.url)) + "</a></div>";
  if (site.show_counts == true || isAdmin) {
    if (site.patients && site.patients !== "0")
      html += "<div class='site-count'>" + addCommas(site.patients) + " patients</div>";
    if (site.encounters && site.encounters !== "0")
      html += "<div class='site-count'>" + addCommas(site.encounters) + " encounters</div>";
    if (site.observations && site.observations !== "0")
      html += "<div class='site-count'>" + addCommas(site.observations) + " observations</div>";
  }
  if (site.contact)
    html += "<div class='site-contact'><span class='site-label'>Contact:</span> " + site.contact + "</div>";

  if (site.email)
    html += "<a href='mailto:"+ site.email + "' class='site-email'><img src='images/mail.png' width='15px' height='15px'/></a>";
  html += "</div>";

  if (site.coowners && site.coowners.length && currentUser !== "visitor" && (site.created_by === currentUser || site.coowners.includes(currentUser))) {
    html += "<div class='site-coowners'><span class='site-label'>Co-owners:</span> ";
    html += site.coowners.join(', ');
    html += "</div>";
  }

  if(site.distribution){
    html += createHtmlForDistributionInfo(site.distribution);
  }

  if (site.notes)
    html += "<fieldset class='site-notes'>" + site.notes + "</fieldset>";
  if (site.type)
    html += "<div class='site-type'><span class='site-type'>" + site.type + "</span>";
  if (versionForSite(site))
    html += "<span class='site-version'>" + versionForSite(site) + "</span></div>";
  if (site.date_changed) {
    var date_updated = dateChangedString(site);
    html += "<div id='site-update'>Last Updated: " + date_updated + "</div>";
  }
  if(canUpdate(site)) {
    if(isValidMarkerId(site.id)) {
      html += "<a value='"+site.id+"' id='update'>Update</a>";
    }
    html += "<div id='edit' value='" + site.id + "' title ='Edit site' class='control' style='position: absolute;overflow:none; right:12px;bottom:12px; color:#3F3F3F'><i class='fa fa-lg fa-pencil' style='color:rgba(171, 166, 166, 1)'></i></div>";
  }
  if(site.created_by === currentUser || isAdmin) {
    html += "<div id='delete' value='" + site.id + "' title ='Delete site' class='control' style='position: absolute;overflow:none; right:12px;bottom:27px; color:#3F3F3F'><i class='fa fa-lg fa-trash-o' style='color:rgba(171, 166, 166, 1)'></i></div>";
  }

  if (site.module === 1 && moduleHasSite === 1 && currentUser !== "visitor"
      && auth_site.indexOf(site.id) !== -1) {
      html += "<div class='me-button'><button type='button' id='detach-button' value='" + site.id + "' title='Detach the site from this server.'";
      html += "class='btn btn-info btn-xs'>This is not me.</button></div>";
  } else if (site.id !== null && moduleUUID !== null
    && currentUser !== "visitor" && auth_site.indexOf(site.id) !== -1) {
    html += "<div class='me-button'><button type='button' id='me-button' value='" + site.id + "' title='Pick the site for this server.'";
    html += "class='btn btn-success btn-xs'>This is me !</button></div>";
  }

  html += "</div>";
  return html;
}

function contentEditwindow(site) {
  var html = "<div class='site-bubble bubble-form'>";
  html += "<form method='post' id='"+ site.id +"' enctype='multipart/form-data'>";
  html += "<div class='form-group'><input type='text' required='true' placeholder='Site Name' title='Site Name' class='form-control input-sm' value='"+ site.name + "' id='name' name='name'></div>";
  html += "<div class='form-group'><input type='url' class='form-control input-sm' placeholder='Site URL' title='Site URL' value='"+ site.url + "' name='url' id='url'></div>";
  html += "<div class='form-group'><p>Image: <br/>"
  html += "<div id='image-hint'>square (prefer 80x80) jpeg or png up to " + Math.round(maxImageUploadSize/1024) + " kb</div>"
  html += "</p><input type='file' title='Image' name='image' id='image' onchange='readImage(event)'></div>";
  html += "<div id='image-error'>image error</div>";
  html += "<div class='form-group'><input type='text' class='form-control input-sm'  placeholder='Contact' title='Contact' value='"+ site.contact + "' name='contact' id ='contact'></div>";
  html += "<div class='form-group'><input type='email' class='form-control input-sm' placeholder='Email' title='Email' value='"+ site.email + "' name='email' id='email'></div>";
  html += "<div class='form-group'><textarea class='form-control' value='' name='notes' rows='2' id='notes' placeholder='Notes'>"+ site.notes + "</textarea></div>";

  html += createDistributionSelectBox(site.distribution, site.nonStandardDistributionName);
  
  if (site.module !== 1) {
    html += "<div class='site-stat'>";
    html += "<div class='form-inline'>Patients <input type='number' pattern='[0-9]' class='form-control input-sm' title='Number of patients' value='"+ site.patients + "' name='patients' id ='patients'></div>";
    html += "<div class='form-inline'><br>Encounters <input type='number' pattern='[0-9]' class='form-control input-sm' title='Number of encounters' value='"+ site.encounters + "' name='encounters' id ='encounters'></div>";
    html += "<div class='form-inline'><br>Observations <input type='number' pattern='[0-9]' class='form-control input-sm' title='Number of observations' value='"+ site.observations + "' name='obs' id ='observations'></div></div><br>";
  } else if (!(typeof counts.patients === "undefined") && countsEnabled) {
    html += "<fieldset class='fieldset'>";
    html += "<legend><div class='form-inline' ><input type='checkbox' style='height:auto;bottom: 2px;position:relative' id='include-count' class='form-control input-sm' title='Include counts in the bubble'> Display counts</div></legend>";
    html += "<div class='site-stat'>";
    html += "<div class='form-inline'>" + patients + " patients</div>";
    html += "<div class='form-inline'>" + encounters + " encounters</div>";
    html += "<div class='form-inline'>" + observations + " observations</div>";
    html += "</div></fieldset>";
  }

  if (site.module !== 1) {
    html += "<div class='form-inline'> OpenMRS Version ";
    html += "<select title='OpenMRS Version' id='version' class='form-control input-sm'>";
    getCachedVersions().forEach(function (version) {
      html += (site.openmrs_version == version.version) ? "<option selected>" : "<option>";
      html += version.version+"</option>"  
    });
    html += "</select></div>";
  }

  html += "<div class='row' style='margin-top:10px;'><div class='col-xs-8'>";
  html += "<select title='Site type' id='type' class='form-control input-sm'>"
  getCachedTypes().forEach(function (type) {
    html += (site.type == type.name) ? "<option selected>" : "<option>";
    html += type.name+"</option>"  
  });
  html += "</select></div>";
  html += "<input type='hidden' id='site' value='"+site.id+"'/>";
  html += "<div class=''><button type='submit' class='btn btn-primary'>Save</button></div></div></form></div></div>";

  if((site.created_by === currentUser || isAdmin) && isValidMarkerId(site.id)) {
    html += "<div id='adv-button'><span class='glyphicon glyphicon glyphicon-cog'></span> Advanced Options &nbsp; <span class='glyphicon glyphicon-chevron-down' id='adv-icon'></span></div>"
    html += "<div id='adv-options'>"
    
    html += "<div class='form-inline'>"
    html += "<input class='form-control' title='Co-owner' name='coowner' id ='coowner' placeholder='Co-owner' style='width:120px; margin:5px;' onkeyup='checkCoOwnerInput()'>"
    html += "<button id='addcoowner' class='btn btn-primary' disabled>Add</button>";
    html += "</div>";

    site.auth.forEach(function(rule) {
      html += rule.principal + "<button class='btn btn-default' id='removecoowner' value='"+rule.id+"' style='margin: 5px;'><span class='glyphicon glyphicon-remove'></span></button>";
    });
    html += "</div>";
  }

  return html;
}
