let map;
let circles = [];
let cent = { lat: 37.5483, lng: -77.4527};
let zip;
let radii = [];
let markers = [];
let scatterChart;
let stats = [];

function send_request(){
  var geocoder = new google.maps.Geocoder;
  geocoder.geocode({'location': cent}, function(results, status) {
    console.log({"center": cent, "zip": zip, "radii": radii})
    var zip = results[0]["address_components"].filter(function(c){ return c["types"] == "postal_code"})[0].short_name
    console.log({"center": cent, "zip": zip, "radii": radii})
	$.get({
        url: 'http://ffed58d2a0e4.ngrok.io',
        data: {"center": cent, "zip": zip, "radii": radii},
        headers: {'content-type': 'application/json'},
        success: function(data){
          stats = data["stats"]
          console.log("Hey");
		  console.log(data);
          for(i=0; i < circles.length; i++) {
       			 m = addMarker(
       			    new google.maps.LatLng(circles[i].getCenter().lat(), circles[i].getBounds().getNorthEast().lng()),
       			    data["stats"][i]["median"].toString());
       			 markers.push(m);
       			 m = addMarker(
       			    new google.maps.LatLng(circles[i].getCenter().lat(), circles[i].getBounds().getSouthWest().lng()),
       			    data["stats"][i]["median"].toString());
       			 markers.push(m);
		  }  
		  samples = 0;
	 	  var l = data["carsInRadii"].length;
          points = []
          for(i=0; i < l; i++) {
		    samples += data["carsInRadii"][i].length;
		    for(j=0; j < data["carsInRadii"][i].length; j++) {
			  points.push({x: data["carsInRadii"][i][j]["distance"], y: data["carsInRadii"][i][j]["fee"]})
            }
          } 
          console.log(points);
          create_chart(points);
          document.getElementById("samples").innerHTML = samples;
		  document.getElementById("error").innerHTML = data["bestFit"]["stdErr"];
		  document.getElementById("slope").innerHTML = data["bestFit"]["slope"];
		  document.getElementById("inter").innerHTML = data["bestFit"]["intercept"];
                
	    },
        error: function(data){
       		console.log(data) 
        }
    }); 
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
           j = parseInt(this.radius/(1609.34*miles));
           document.getElementById("ring").innerHTML = this.radius/(1609.34*miles);
           document.getElementById("mile").innerHTML = this.radius/1609.34; 
           document.getElementById("min").innerHTML = stats[j]["min"]
           document.getElementById("max").innerHTML = stats[j]["max"]
           document.getElementById("med").innerHTML = stats[j]["median"]
           document.getElementById("avg").innerHTML = stats[j]["average"]
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
	send_request();
	/*for (i=0; i < circles.length; i++) {        
        m = addMarker(
           new google.maps.LatLng(circles[i].getCenter().lat(), circles[i].getBounds().getNorthEast().lng()),
           "");
        markers.push(m);
        m = addMarker(
           new google.maps.LatLng(circles[i].getCenter().lat(), circles[i].getBounds().getSouthWest().lng()),
           "");
        markers.push(m);
    }*/
}

function initMap() {
	map = new google.maps.Map(document.getElementById("map"), {
		center: cent,
		zoom: 5,
	});
	setRings(cent, 5, 5, 100)

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
function clean_chart() {
	scatterChart.destroy();
}
function create_chart(data) {
    var ctx = document.getElementById('myChart');
    scatterChart = new Chart(ctx, {
    type: 'scatter',
    data: {
        datasets: [{
            label: '',
            data: data,
            pointBackgroundColor: 'FFC107'
        }]
    },
    options: {
        title: {
            display: true,
            text: "Transfer Fee Versus Distance",
			fontColor: '#FFC107'
		},
        scales: {
            xAxes: [{
                type: 'linear',
                position: 'bottom',
                gridLines:{color: '#FFC107', display:false},
                ticks: {fontColor: '#FFC107'}
            }],
            yAxes: [{
                type: 'linear',
                gridLines:{color: '#FFC107', display:false},
                ticks: {fontColor: '#FFC107'}
            }],
        }
    }
    });
}

function init() {
	$(document).ready(function(){
    	$('.sidenav').sidenav();
	});
    create_chart();//temp_data);
}

init()
