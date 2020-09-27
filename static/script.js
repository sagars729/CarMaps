let map;
let circles = [];
let cent = { lat: 37.5483, lng: -77.4527};
let zip;
let radii = [];
let markers = [];

function build_request(){
  var geocoder = new google.maps.Geocoder;
  geocoder.geocode({'location': cent}, function(results, status) {
    console.log({"center": cent, "zip": zip, "radii": radii})
    var zip = results[0]["address_components"].filter(function(c){ return c["types"] == "postal_code"})[0].short_name
    return {"center": cent, "zip": zip, "radii": radii};
  });
}

function setRings(center, zoom, rings, miles) {
	map.setZoom(zoom)
	for (i=rings-1; i >= 0; i--) {
		var cityCircle = new google.maps.Circle({
            strokeColor: "#FF0000",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#FF0000",
            fillOpacity: 0,
            map,
            center: center,
            radius: 1609.34*miles*i,
          });
        google.maps.event.addListener(cityCircle,"mouseover",function(){
           this.setOptions({strokeColor: "#00FF00"});
           document.getElementById("ring").innerHTML = this.radius/(1609.34*miles);
           document.getElementById("mile").innerHTML = this.radius/1609.34; 
        }); 

        google.maps.event.addListener(cityCircle,"mouseout",function(){
          this.setOptions({strokeColor: "#FF0000"});
        });
        circles.unshift(cityCircle);
        radii.unshift(miles*i);
		//circles.push(cityCircle)
        //radii.push(miles*i)
	}
    addData();
	return map;
}

function remove_circle(circle) {
    // remove event listers
	console.log(circle)
    google.maps.event.clearListeners(circle, 'click_handler_name');
    google.maps.event.clearListeners(circle, 'drag_handler_name');
    circle.setRadius(0);
	circle.setVisible(false);
    // if polygon:
    // polygon_shape.setPath([]); 
    circle.setMap(null);
}

function clearRings() {
	var l = circles.length
	for (i=0; i < l; i++) { 
		remove_circle(circles.pop())
        markers.pop().setMap(null);
        markers.pop().setMap(null);
        radii.pop();
	}
}

function addMarker(location, label) {
  // Add the marker at the clicked location, and add the next-available label
  // from the array of alphabetical characters.
  m = new google.maps.Marker({
    position: location,
    label: label,
    map: map,
  });
  return m;
}


function addData() {
	for (i=0; i < circles.length; i++) {
        
        m = addMarker(
           new google.maps.LatLng(circles[i].getCenter().lat(), circles[i].getBounds().getNorthEast().lng()),
           "0");
        markers.push(m);
        m = addMarker(
           new google.maps.LatLng(circles[i].getCenter().lat(), circles[i].getBounds().getSouthWest().lng()),
           "0");
        markers.push(m);
    }
}

function initMap() {
	map = new google.maps.Map(document.getElementById("map"), {
		center: cent,
		zoom: 5,
	});
	setRings(cent, 5, 30, 100)

    const input = document.getElementById("search");
	const autocomplete = new google.maps.places.Autocomplete(input);
	const rings = document.getElementById("rings");
	const miles = document.getElementById("miles");
    const geocoder = new google.maps.Geocoder;

	autocomplete.addListener("place_changed", () => {
		const place = autocomplete.getPlace();
		if (!place.geometry) {
      		// User entered the name of a Place that was not suggested and
      		// pressed the Enter key, or the Place Details request failed.
      		window.alert("No details available for input: '" + place.name + "'");
      		return;
    	}
	    cent = place.geometry.location;
		map.setCenter(place.geometry.location);
		clearRings();
		setRings(place.geometry.location, 5, rings.value, miles.value);
	});
	
	rings.addEventListener("change", function() {
      console.log(rings.value);
	  clearRings();
	  setRings(cent, 5, rings.value, miles.value);
    });
	
    miles.addEventListener("change", function() {
      console.log(rings.value);
	  clearRings();
	  setRings(cent, 5, rings.value, miles.value);
    });
}

function init() {
	$(document).ready(function(){
    	$('.sidenav').sidenav();
	});
}

init()
