'use strict';

// y axis offset for scene coordinates
var sceneOffsets = {
    "barnhousea": 150,
    "campoffice": 150,
    "campoffice_sandbox": undefined,
    "caveb": 0,
    "cavec": 0,
    "caved": 0,
    "coastalhousea": 150,
    "coastalhouseb": 150,
    "coastalhousec": 150,
    "coastalhoused": 150,
    "coastalhousee": 150,
    "coastalhousef": 150,
    "coastalhouseg": 150,
    "coastalhouseh": 150,
    "coastalhouseh_sandbox": undefined,
    "dam": undefined,
    "dam_sandbox": undefined,
    "farmhousea": 150,
    "farmhouseabasement": 150,
    "fishingcabina": 150,
    "fishingcabinb": 150,
    "fishingcabinc": 150,
    "fishingcabind": 150,
    "housebasementc": 150,
    "housebasemente": 150,
    "housebasementf": 150,
    "housebasementpv": 0,
    "housebasementpv_sandbox": undefined,
    "lakecabina": undefined,
    "lakecabina_sandbox": undefined,
    "lakecabinb": undefined,
    "lakecabinb_sandbox": undefined,
    "lakecabinc": 150,
    "lakecabinc_sandbox": undefined,
    "lakecabind": undefined,
    "lakecabind_sandbox": 150,
    "lakecabine": undefined,
    "lakecabine_sandbox": undefined,
    "lakecabinf": undefined,
    "lakecabinf_sandbox": undefined,
    "lighthousea": 150,
    "mountaincavea": 0,
    "mountaincaveb": 0,
    "preppercachea": 150,
    "preppercacheb": undefined,
    "preppercachec": 150,
    "preppercached": undefined,
    "preppercachee": 150,
    "preppercacheempty": undefined,
    "preppercachef": 150,
    "quonsetgasstation": 150,
    "radiocontrolhut": 0,
    "radiocontrolhut_sandbox": undefined,
    "ruralstorea": 150,
    "safehousea": 150,
    "safehousea_sandbox": 150,
    "trailera": 150,
    "trailerb": 150,
    "trailerc": 150,
    "trailerd": 150,
    "trailersshape": undefined,
    "whalingmine": 0,
    "whalingshipa": 0,
    "whalingwarehousea": 0,
    "coastalregion": 0,
    "crashmountainregion": 0,
    "damcavetransitionzone": 0,
    "damrivertransitionzoneb": 0,
    "damtransitionzone": 0,
    "damtransitionzone_sandbox": 0,
    "highwayminetransitionzone": 0,
    "highwaytransitionzone": 0,
    "lakeregion": undefined,
    "lakeregion_sandbox": 0,
    "marshregion": undefined,
    "marshregion_sandbox": undefined,
    "minetransitionzone": 0,
    "ravinetransitionzone": 0,
    "ruralregion": 0,
    "ruralregion_sandbox": undefined,
    "whalingstationregion": 0
};

$(function () {
    $('select').material_select();

    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
        alert("The necessary File APIs are not fully supported in this browser. Please update your browser or try a different one.");
    }

    $("#convert").on("click", function () {
        var warningSeen = localStorage.getItem("warningSeen") == true;

        if (warningSeen) {
            var files = document.getElementById('fileSelector').files;
            migrateSave(files);
        } else {
            $("#modal1").modal("open");
        }
    });

    $("#modal1").modal({
        dismissible: false, // Modal can be dismissed by clicking outside of the modal
        complete: function () {
            try {
                localStorage.setItem("warningSeen", true);
                var files = document.getElementById("fileSelector").files;
                migrateSave(files);
            } catch (e) {
            }
        }
    });

});

function migrateSave(files) {
    var bootFile, globalFile, scenesFile;
    for (let i = 0; i < files.length; i++) {
        var file = files[i];
        if (file.name === "boot")
            bootFile = file;
        else if (file.name === "global")
            globalFile = file;
        else if (file.name === "scenes.zip")
            scenesFile = file;
    }

    if (!globalFile || !bootFile || !scenesFile) {
        alert("Your save must contain files \"global\", \"boot\" and \"scenes.zip\"");
    }
    ga('send', 'ConvertStarted');

    var newSave = {
        m_Timestamp: bootFile.lastModifiedDate || "23.5.2017 17:11",
        m_Name: "ep1sandbox" + $("#SaveSlot").val(),
        m_Dict: {}
    };

    var bootScene = "";
    // Boot
    var reader1 = new FileReader();
    reader1.onload = (function (event) {

        var boot = JSON.parse(decompressString(event.target.result));
        bootScene = boot.m_SceneName;
        newSave.m_Dict.boot = Array.from(new Uint8Array(event.target.result));

        // Global
        var reader2 = new FileReader();
        reader2.onload = (function (event) {
            var data = event.target.result;
            var global = JSON.parse(decompressString(data));

            var experienceManager = JSON.parse(global.m_ExperienceModeManagerSerialized);
            if (experienceManager.m_CurrentModeType.indexOf("Challenge") > -1) {
                newSave.m_Name = "ep1challenge" + $("#SaveSlot").val();
            }
            if (sceneOffsets[bootScene.toLowerCase()]) {
                var playerManager = JSON.parse(global.m_PlayerManagerSerialized);
                playerManager.m_SaveGamePosition[1] += sceneOffsets[bootScene.toLowerCase()];
                global.m_PlayerManagerSerialized = JSON.stringify(playerManager);
                data = compressString(JSON.stringify(global));
            }
            newSave.m_DisplayName = global.m_UserDefinedSaveSlotName;
            newSave.m_Dict.global = Array.from(new Uint8Array(data));

            // Scenes
            var reader3 = new FileReader();
            reader3.onload = (function (event) {

                var zip = new JSZip();
                JSZip.loadAsync(event.target.result).then(function (zip) {
                    var zipAsyncFiles = 0;
                    zip.forEach(function (relativePath, zipEntry) {
                        if (!zipEntry.dir) {
                            zipAsyncFiles++;
                            zipEntry.async('ArrayBuffer').then(function (fileData) {
                                zipAsyncFiles--;

                                var scene = JSON.parse(decompressString(fileData));

                                var spawnManager = JSON.parse(scene.m_SpawnRegionManagerSerialized);
                                for (let i = 0; i < spawnManager.m_SerializedSpawnRegions.length; i++) {
                                    try {
                                        var spawnRegion = JSON.parse(spawnManager.m_SerializedSpawnRegions[i].m_SearializedSpawnRegion);
                                    } catch (e) {
                                        console.log(e);
                                        console.log(spawnManager.m_SerializedSpawnRegions[i].m_SearializedSpawnRegion);
                                    }
                                    spawnRegion.m_ActiveSpawns = [];
                                    spawnManager.m_SerializedSpawnRegions[i].m_SearializedSpawnRegion = JSON.stringify(spawnRegion);
                                }
                                scene.m_SpawnRegionManagerSerialized = JSON.stringify(spawnManager);
                                spawnManager = null;

                                if (sceneOffsets[zipEntry.name.toLowerCase()]) {
                                    var sceneOffset = sceneOffsets[zipEntry.name.toLowerCase()];

                                    var gearManager = JSON.parse(scene.m_GearManagerSerialized);
                                    for (let i = 0; i < gearManager.m_SerializedItems.length; i++) {
                                        var gear = JSON.parse(gearManager.m_SerializedItems[i].m_SearializedGear);
                                        gear.m_Position[1] += sceneOffset;
                                        gearManager.m_SerializedItems[i].m_SearializedGear = JSON.stringify(gear);
                                    }
                                    scene.m_GearManagerSerialized = JSON.stringify(gearManager);
                                    gearManager = null;

                                    scene.m_ContainerManagerSerialized = applySceneOffset(scene.m_ContainerManagerSerialized, sceneOffset, "m_Position", "m_SerializedContainers");
                                    scene.m_ArrowManagerSerialized = applySceneOffset(scene.m_ArrowManagerSerialized, sceneOffset, "m_LocalPosition", "m_SerializedItems");
                                    scene.m_FlareGunRoundManagerSerialized = applySceneOffset(scene.m_FlareGunRoundManagerSerialized, sceneOffset, "m_LocalPosition", "m_SerializedItems");
                                    scene.m_FireManagerSerialized = applySceneOffset(scene.m_FireManagerSerialized, sceneOffset, "m_Position", "m_SerializedFires");
                                    scene.m_RandomSpawnObjectManagerSerialized = applySceneOffset(scene.m_RandomSpawnObjectManagerSerialized, sceneOffset, "m_Position", "m_SaveDataList");
                                    scene.m_WaterSourceManagerSerialized = applySceneOffset(scene.m_WaterSourceManagerSerialized, sceneOffset, "m_Position", "m_SerializedWaterSources");
                                    scene.m_BodyHarvestManagerSerialized = applySceneOffset(scene.m_BodyHarvestManagerSerialized, sceneOffset, "m_Position", "m_SerializedBodyHarvests");
                                    scene.m_DynamicDecalsManagerSerialized = applySceneOffset(scene.m_DynamicDecalsManagerSerialized, sceneOffset, "m_Pos", "m_SerializedDecalProjectors");
                                    scene.m_IceFishingHolesSerialized = applySceneOffset(scene.m_IceFishingHolesSerialized, sceneOffset, "m_Position", "strings", true);
                                    scene.m_HarvestablesSerialized = applySceneOffset(scene.m_HarvestablesSerialized, sceneOffset, "m_Position", "strings", true);
                                    scene.m_BreakDownObjectsSerialized = applySceneOffset(scene.m_BreakDownObjectsSerialized, sceneOffset, "m_Position", "strings", true);
                                    scene.m_RadialObjectSpawnersSerialized = applySceneOffset(scene.m_RadialObjectSpawnersSerialized, sceneOffset, "m_Position", "strings", true);
                                    scene.m_StickToGroundObjectsSerialized = applySceneOffset(scene.m_StickToGroundObjectsSerialized, sceneOffset, "m_Position", "strings", true);

                                    fileData = compressString(JSON.stringify(scene));
                                }

                                newSave.m_Dict[zipEntry.name] = Array.from(new Uint8Array(fileData));
                                if (zipAsyncFiles === 0) {
                                    saveFile(serializeSave(newSave), newSave.m_Name, "");
                                    ga('send', 'ConvertCompleted');
                                }
                            }, function (error) {
                                alert(error.message);
                            });
                        }
                    });
                }, function (e) {
                    alert(e.message);
                });
            });
            reader3.readAsArrayBuffer(scenesFile);
        });
        reader2.readAsArrayBuffer(globalFile);
    });
    reader1.readAsArrayBuffer(bootFile);
}

function applySceneOffset(o, offset, positionName, firstChild, deserializeChild) {
    if (o === null || o === undefined)
        return o;
    var deserializedObject = JSON.parse(o);
    if (deserializedObject[firstChild] === undefined)
        return null;
    for (let i = 0; i < deserializedObject[firstChild].length; i++) {
        if (deserializedObject[firstChild][i] === null || deserializedObject[firstChild][i][positionName] === undefined)
            continue;
        if (deserializeChild) {
            var deserializedChild = JSON.parse(deserializedObject[firstChild][i]);
            deserializedChild[positionName][1] += offset;
            deserializedObject[firstChild][i] = JSON.stringify(deserializedChild);
        } else {
            deserializedObject[firstChild][i][positionName][1] += offset;
        }

    }
    return JSON.stringify(deserializedObject);
}

function serializeSave(save) {
    return compressString(JSON.stringify(save));
}

function stringToUint(str) {
    var uintArray = [];
    for (let i = 0; i < str.length; i++) {
        uintArray.push(str.charCodeAt(i));
    }
    return new Uint8Array(uintArray);
}

function uintToString(uintArray) {
    var str = "";
    for (let i = 0; i < uintArray.length; i++) {
        str += String.fromCharCode(uintArray[i]);
    }
    return str;
}

function compressString(str) {
    return LZF.compress(stringToUint(str).buffer);
}

function decompressString(data) {
    var decompressed = LZF.decompress(data);
    return uintToString(new Uint8Array(decompressed));
}

function saveFile(data, filename, type) {
    var file = new Blob([data], {type: type});

    var a = document.createElement("a"),
            url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
}
