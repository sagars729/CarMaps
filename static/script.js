let map;
let circles = [];

function setRings(center, zoom, rings) {
	map.setZoom(zoom)
	for (i=0; i < rings; i++) {
		var cityCircle = new google.maps.Circle({
            strokeColor: "#FF0000",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#FF0000",
            fillOpacity: 0,
            map,
            center: center,
            radius: 160934*i,
          });
		circles.push(cityCircle)
	}
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
	}
}
function initMap() {
	map = new google.maps.Map(document.getElementById("map"), {
		center: { lat: 37.5483, lng: -77.4527},
		zoom: 5,
	});
	setRings({lat: 37.5483, lng: -77.4527}, 5, 30)
    const input = document.getElementById("search");
	const autocomplete = new google.maps.places.Autocomplete(input);
	autocomplete.addListener("place_changed", () => {
		const place = autocomplete.getPlace();
		if (!place.geometry) {
      		// User entered the name of a Place that was not suggested and
      		// pressed the Enter key, or the Place Details request failed.
      		window.alert("No details available for input: '" + place.name + "'");
      		return;
    	}
		
		map.setCenter(place.geometry.location);
		clearRings();
		setRings(place.geometry.location, 5, 30);
	});
		
}

function init() {
	$(document).ready(function(){
    	$('.sidenav').sidenav();
	});
}

init()
