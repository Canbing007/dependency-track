/*
 * This file is part of Dependency-Track.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Copyright (c) Steve Springett. All Rights Reserved.
 */

"use strict";

/**
 * Called by bootstrap table to format the data in the dependencies table.
 */
function formatDependenciesTable(res) {
    let dependenciesTable = $("#dependenciesTable");
    for (let i=0; i<res.length; i++) {
        let componenturl = "../component/?uuid=" + res[i].component.uuid;
        res[i].componenthref = "<a href=\"" + componenturl + "\">" + filterXSS(res[i].component.name)+ "</a>";
        res[i].component.version = filterXSS(res[i].component.version);
        res[i].component.group = filterXSS(res[i].component.group);

        if (res[i].component.hasOwnProperty("resolvedLicense")) {
            let licenseurl = "../license/?licenseId=" + res[i].component.resolvedLicense.licenseId;
            res[i].component.license = "<a href=\"" + licenseurl + "\">" + filterXSS(res[i].component.resolvedLicense.licenseId) + "</a>";
        }

        $rest.getComponentCurrentMetrics(res[i].component.uuid, function (data) {
            res[i].component.vulnerabilities = $common.generateSeverityProgressBar(data.critical, data.high, data.medium, data.low);
            dependenciesTable.bootstrapTable("updateRow", {
                index: i,
                row: res[i].component
            });
        });
    }
    return res;
}

/**
 * Called by bootstrap table to format the data in the components table (when adding a new dependency from an existing component).
 */
function formatComponentsTable(res) {
    for (let i=0; i<res.length; i++) {
        res[i].name = filterXSS(res[i].name);
        res[i].version = filterXSS(res[i].version);
        res[i].group = filterXSS(res[i].group);
    }
    return res;
}

/**
 * Given a comma-separated string of tags, creates an
 * array of tag objects.
 */
function tagsStringToObjectArray(tagsString) {
    let tagsArray = [];
    if (!$common.isEmpty(tagsString)) {
        let tmpArray = tagsString.split(",");
        for (let i in tmpArray) {
            tagsArray.push({name: tmpArray[i]});
        }
    }
    return tagsArray;
}

/**
 * Clears all the input fields from the modal.
 */
function clearInputFields() {
    $("#createComponentNameInput").val("");
    $("#createComponentVersionInput").val("");
    $("#createComponentGroupInput").val("");
    $("#createComponentDescriptionInput").val("");
    $("#createComponentLicenseSelect").val("");
}

function populateProjectData(data) {
    let escapedProjectName = filterXSS(data.name);
    let escapedProjectVersion = filterXSS(data.version);
    let escapedProjectDescription = filterXSS(data.description);

    $("#projectNameInput").val(data.name);
    $("#projectVersionInput").val(data.version);
    $("#projectDescriptionInput").val(data.description);

    $("#projectTitle").html(escapedProjectName);
    if (data.version) {
        $("#projectVersion").html(" &#x025B8; " + escapedProjectVersion);
    } else {
        $("#projectVersion").empty();
    }
    if (data.tags) {
        let html = "";
        let tagsInput = $("#projectTagsInput");
        for (let i=0; i<data.tags.length; i++) {
            let tag = data.tags[i].name;
            html += `<a href="../projects/?tag=${encodeURIComponent(tag)}"><span class="badge tag-standalone">${filterXSS(tag)}</span></a>`;
            tagsInput.tagsinput("add", tag);
        }
        $("#tags").html(html);
    } else {
        $("#tags").empty();
    }
    if (data.properties) {
        $("#projectPropertiesTable").css("display", "table");
        let html = "";
        for (let i=0; i<data.properties.length; i++) {
            let property = data.properties[i];
            html += `<tr><td>${filterXSS(property.key)}</td><td>${filterXSS(property.value)}</td></tr>`;
        }
        $("#projectPropertiesTableData").html(html);
    } else {
        $("#projectPropertiesTableData").empty();
        $("#projectPropertiesTable").css("display", "none");
    }
}

function populateLicenseData(data) {
    let select = $("#createComponentLicenseSelect");
    $.each(data, function() {
        select.append($("<option />").val(this.licenseId).text(this.name));
    });
    select.selectpicker("refresh");
}

function populateMetrics(data) {
    $("#metricCritical").html(data.critical);
    $("#metricHigh").html(data.high);
    $("#metricMedium").html(data.medium);
    $("#metricLow").html(data.low);
    $("#metricIrs").html(data.inheritedRiskScore);
}

/**
 * Setup events and trigger other stuff when the page is loaded and ready
 */
$(document).ready(function () {
    let uuid = $.getUrlVar("uuid");

    $rest.getProject(uuid, populateProjectData);
    $rest.getLicenses(populateLicenseData);
    $rest.getProjectCurrentMetrics(uuid, populateMetrics);

    // Listen for when the button to add a dependency from a new component is clicked
    $("#addDependencyFromNewButton").on("click", function () {
        const name = $("#createComponentNameInput").val();
        const version = $("#createComponentVersionInput").val();
        const group = $("#createComponentGroupInput").val();
        const description = $("#createComponentDescriptionInput").val();
        const licenseId = $("#createComponentLicenseSelect").val();
        $rest.createComponent(name, version, group, description, licenseId, function(data) {
            $rest.addDependency(uuid, [data.uuid], null, function() {
                $("#dependenciesTable").bootstrapTable("refresh", {silent: true});
            });
        });
        $("#modalAddDependency").modal("hide");
        $("#componentsTable").bootstrapTable("uncheckAll");
        clearInputFields();
    });

    // Listen for when the button to add a dependency from an existing component is clicked
    $("#addDependencyFromExistingButton").on("click", function () {
        let componentsTable = $("#componentsTable");
        let selections = componentsTable.bootstrapTable("getSelections");
        let componentUuids = [];
        for (let i=0; i<selections.length; i++) {
            componentUuids[i] = selections[i].uuid;
        }
        $rest.addDependency(uuid, componentUuids, null, function() {
            $("#dependenciesTable").bootstrapTable("refresh", {silent: true});
        });
        $("#modalAddDependency").modal("hide");
        componentsTable.bootstrapTable("uncheckAll");
        clearInputFields();
    });

    // When modal closes, clear out the input fields
    $("#modalAddDependency").on("hidden.bs.modal", function () {
        clearInputFields();
    });

    // Listen for when the button to remove a dependency is clicked
    $("#removeDependencyButton").on("click", function () {
        let dependenciesTable = $("#dependenciesTable");
        let selections = dependenciesTable.bootstrapTable("getSelections");
        let componentUuids = [];
        for (let i=0; i<selections.length; i++) {
            componentUuids[i] = selections[i].uuid;
        }
        $rest.removeDependency(uuid, componentUuids, function() {
            $("#dependenciesTable").bootstrapTable("refresh", {silent: true});
        });
        dependenciesTable.bootstrapTable("uncheckAll");
    });

    $("#updateProjectButton").on("click", function () {
        let name = $("#projectNameInput").val();
        let version = $("#projectVersionInput").val();
        let description = $("#projectDescriptionInput").val();
        let tags = $common.csvStringToObjectArray($("#projectTagsInput").val());
        $rest.updateProject(uuid, name, version, description, tags, function() {
            $rest.getProject(uuid, populateProjectData);
        });
    });

    $("#deleteProjectButton").on("click", function () {
        $rest.deleteProject(uuid, function() {
            window.location.href = "../projects";
        });
    });

});