let map;

function initMap() {
	map = new google.maps.Map(document.getElementById("map"), {
		center: { lat: 37.5483, lng: -77.4527},
		zoom: 4,
	});
	for (i=0; i < 30; i++) {
		const cityCircle = new google.maps.Circle({
            strokeColor: "#FF0000",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#FF0000",
            fillOpacity: 0,
            map,
            center: {lat: 37.5483, lng: -77.4527},
            radius: 160934*i,
          });
	}
}

