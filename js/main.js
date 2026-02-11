(function(){

    let routeFile,
        geoJson = {
            type: "FeatureCollection",
            features:[]
        },
        newLines;

    let map = L.map('map',{doubleClickZoom:false}).setView([43.075, -89.40], 16);
    //line drawing variables
    let lineSegments = [],
        polyline,
        previewLine,
        draw = false;

    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);
    //route export
    document.querySelector("#export-route").addEventListener("click",function(){
        //get base id value
        if (routeFile){
            let highId = routeFile.features.length;
            geoJson.features.forEach(function(feature){
                highId += 1; 
                feature.properties.id = highId;
                routeFile.features.push(feature)
            })
            var hiddenElement = document.createElement('a');

            hiddenElement.href = 'data:attachment/text,' + JSON.stringify(routeFile);
            hiddenElement.target = '_blank';
            hiddenElement.download = 'routes.json';
            hiddenElement.click();
        }
        else{
            alert("No Route File Uploaded");
        }
    })
    //route upload
    document.querySelector("#upload-route").addEventListener("click",function(){
        document.querySelector("#route-upload-form").style.display = "block";
        document.querySelector("#close-route-upload").addEventListener("click",function(){
            document.querySelector("#route-upload-form").style.display = "none";
        })
    })
    document.querySelector("#route-input").addEventListener("change",function(){
        uploadFile(this, "line");
    })
    //site upload
    document.querySelector("#upload-stops").addEventListener("click",function(){
        document.querySelector("#stop-upload-form").style.display = "block";
        document.querySelector("#close-stop-upload").addEventListener("click",function(){
            document.querySelector("#stop-upload-form").style.display = "none";
        })
    })
    document.querySelector("#stop-input").addEventListener("change",function(){
        uploadFile(this, "point");
    })
    function uploadFile(input, type){
        let file = input.files[0]

        let reader = new FileReader();
        let display_file = (e) => { 
            //console.info( '. . got: ', e.target.result.length, e );
            let upload = e.target.result;
            
            if (type == "point")
                addSites(upload)
            if (type == "line")
                addRoute(upload);
        };
        let on_reader_load = ( fl ) => {
            //console.info( '. file reader load', fl );
            return display_file; // a function
        };
        reader.onload = on_reader_load(file);
        //Read the file as text.
        reader.readAsText(file);
    }
    function addSites(sites){
        let json = JSON.parse(sites)
        L.geoJson(json,{interactive:false}).addTo(map)
        document.querySelector("#stop-upload-form").style.display = "none";
    }
    function addRoute(route){
        routeFile = JSON.parse(route);
        L.geoJson(routeFile,{interactive:false}).addTo(map)
        document.querySelector("#route-upload-form").style.display = "none";
        document.querySelector("#export-route").disabled = false;
    }
    //activate drawing mode
    document.querySelector("#draw").addEventListener("click",function(){
        draw = true;
        document.querySelector("#buttons").insertAdjacentHTML("beforeend","<p id='how-to-line'>Click to Add Points</br>Double Click to close line.</p>")
        document.querySelector("#map").style.cursor = "pointer";
    })
    //map listeners
    map.on('mousedown', function(e) {
        if (draw){
            var latlng = [e.latlng.lat,e.latlng.lng];
            //remove preview line and add segments to line
            if (previewLine){
                previewLine.remove(map);
            }
            lineSegments.push(latlng);
            if (polyline){
                polyline.addLatLng(e.latlng)
            }
            else{
                polyline = L.polyline(lineSegments, {color:"black"}).addTo(map);
            }
        }
    });   
    map.on('dblclick', function(e) {
        var latlng = [e.latlng.lat,e.latlng.lng];
        //remove preview lines from map
        if (polyline){
            polyline.remove(map);
            polyline = null;
            document.querySelector("#how-to-line").remove();
        }
        lineSegments.push(latlng);
        //aggregate latlngs into full line
        var finalLine = L.polyline(lineSegments, {color:"black"});
        createLineWindow(finalLine, e.containerPoint);
        //reset lines
        lineSegments = [];
        polyline = null;
        previewLine = null;
        draw = false;
        document.querySelector("#map").style.cursor = "grab";
    })
    map.on('mousemove', function(e) {
        if (draw){
            var latlng = [e.latlng.lat,e.latlng.lng];
            //create preview line
            var current = lineSegments.length - 1;
            if (previewLine){
                previewLine.remove(map);
            }
            if (current >= 0){
                var previewLineSegments = [lineSegments[current],latlng];
                previewLine = L.polyline(previewLineSegments, {color:"black", className:"templine"}).addTo(map);
            }
        }
    });  

    function createLineWindow(newFeature,pos,curLine){
        let test = newFeature.toGeoJSON(),
            latlng = map.getCenter();

        var popup = L.popup({closeOnClick:false, closeButton:false})
            .setLatLng(latlng)
            .setContent('<div id="popup"><p>Tour Name: <input id="tour"></p><p>Starting Stop: <input id="start"></p><p>Ending Stop: <input id="end"></br><button id="submit">Submit</button><button id="cancel">Cancel</button></div>')
            .openOn(map);

        document.querySelector("#cancel").addEventListener("click",function(){
            newFeature.remove();
            popup.remove();
        })
        
        document.querySelector("#submit").addEventListener("click",function(){
            let s = document.querySelector("#start").value ? document.querySelector("#start").value : 'none';
            let e = document.querySelector("#end").value ? document.querySelector("#end").value : 'none';
            let t = document.querySelector("#tour").value ? document.querySelector("#tour").value : 'none';

            if (s != 'none' && e != 'none'){
                test.properties.end = String(e);
                test.properties.start = String(s);
                test.properties.tours = String(t);
                test.properties.id = 0;
                test.properties.label = null;
                popup.remove();
                geoJson.features.push(test)
                if (newLines){
                    newLines.remove(map)
                    newLines = null;
                }
                newLines = L.geoJson(geoJson,{
                    onEachFeature:function(feature,layer){
                        layer.on("click",function(){
                            layer.bindPopup('<div id="popup"><p>Tour Name: <input id="edit-tour" value="' + feature.properties.tours + '"></p><p>Starting Stop: <input id="edit-start" value="' + feature.properties.start + '"></p><p>Ending Stop: <input id="edit-end" value="' + feature.properties.end + '"></br><button id="edit-submit">Submit</button><button id="edit-cancel">Cancel</button><button id="edit-delete">Delete</button></div>')
                        })
                        layer.on("popupopen",function(){
                            document.querySelector("#edit-submit").addEventListener("click",function(){
                                feature.properties.end = String(document.querySelector("#edit-end").value);
                                feature.properties.start = String(document.querySelector("#edit-start").value);
                                feature.properties.tours = String(document.querySelector("#edit-tour").value);
                                geoJson = newLines.toGeoJSON();
                            })
                            document.querySelector("#edit-delete").addEventListener("click",function(){
                                newLines.removeLayer(layer)
                                newFeature.remove()
                                geoJson = newLines.toGeoJSON();
                            })
                            document.querySelector("#edit-cancel").addEventListener("click",function(){
                                layer.closePopup()
                            })
                        })
                    }
                }).addTo(map)
            }
            else{
                document.querySelector("#popup").insertAdjacentHTML("beforeend","<p>Please enter values for both the start and the end.</p>")
            }
        })
            
        newFeature.addTo(map);
    }

})();
