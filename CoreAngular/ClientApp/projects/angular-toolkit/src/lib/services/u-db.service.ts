
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { UfwInterface } from './ufw-interface';

import * as moment from 'moment';

import * as $ from 'jquery';
declare var $: any;

@Injectable()
export class UDbService {

	public view_key_value = "";
	public record_position = 0;
	public view_tab = 0;

	public primary_dataset = null;

	public on_binding = false;
	public auto_update = false;
	public datasets: any = "";

	public context: any;

	constructor(public ufw: UfwInterface, public router: Router) {
	}


	//=================================================================================
	selectTab(class_name, tab) { 	//tabindex start at 0 
		$(class_name + ' li').removeClass('active');
		$('.tab-content .tab-pane').removeClass('active');

		$('a[href="#tab' + tab + '"]').closest('li').addClass('active');
		$('#tab' + tab).addClass('active');
	}


	//=================================================================================
	prepareDatasets(businessObject) {

		this.datasets = businessObject.datasets;
		if (!this.datasets) return;

		for (var i = 0; i < this.datasets.length; i++) {
			this.datasets[i].dataset_format = JSON.parse(this.datasets[i].dataset_format);
			this.datasets[i].dataset_content = JSON.parse(this.datasets[i].dataset_content);
		}

		this.primary_dataset = this.datasets[0];

		if (this.primary_dataset.dataset_content.length === 0) {
			this.createNewPrimaryRow();
		}

		if (this.record_position > this.primary_dataset.dataset_content.length - 1)
			this.record_position = this.primary_dataset.dataset_content.length - 1;
	}


	//=================================================================================
	createNewPrimaryRow() {
		var newRow = {};

		for (var key in this.primary_dataset.dataset_format[0]) {
			newRow[key] = '';
		}

		newRow['__State'] = '1';
		this.primary_dataset.dataset_content.push(newRow);
	}


	//=================================================================================
	genericActionsExit() {
		this.genericActions('Exit');
	}


	//=================================================================================
	genericActions(action) {
		if (action) {
			if (action.includes("New")) {
				this.onNewRecordEvent();
				return false;
			}
			if (action.includes("Delete")) {
				this.onDeleteRecordEvent();
				return false;
			}
			if (action.includes("Exit")) {
				this.onBackToCallerEvent();
				return false;
			}
		}

		return true;
	}


	//=================================================================================
	bindData(caller?) {
		if (caller) this.context = caller;

		var element_navpos = document.getElementById('eid_nav_position');
		if (element_navpos) {
			var navpos = (this.record_position + 1).toString() + " / " + this.primary_dataset.dataset_content.length.toString();
			(element_navpos as HTMLInputElement).value = navpos;
		}

		this.on_binding = true;

		if (this.context && (typeof this.context.beforeBinding !== 'undefined' && typeof this.context.beforeBinding === 'function')) {
			this.context.beforeBinding();
		}

		this.bindInputs();
		this.bindPhones();
		this.bindAddresses();
		this.bindTables();
		this.bindSelects();

		if (this.context && (typeof this.context.afterBinding !== 'undefined' && typeof this.context.afterBinding === 'function')) {
			this.context.afterBinding();
		}

		this.on_binding = false;

		this.setNavigationButtonsBehavior();
	}


	//=================================================================================
	bindSelects() {
		var value = '';

		Array.from(document.getElementsByTagName('ng-select')).forEach((select) => {

			var dataset_name = select.getAttribute('data-dataset');
			if (dataset_name) {
				this.context.setSelectionList(select, dataset_name);
			}

			var bind = select.getAttribute('data-bind');
			if (bind) {
				value = this.primary_dataset.dataset_content[this.record_position][bind];
				if (!value) value = '';
				this.context.setSelectedValue(select.id, value);
			}
		})
	}


  //=================================================================================
	bindTables() {
		Array.from(document.getElementsByTagName('table')).forEach((table) => {
			var tableRows: any = "";

			var dataset_name = table.getAttribute('data-bind');
			if (dataset_name) {
				var dataset = this.getDataset(dataset_name);
				if (dataset) {
					while (table.tBodies.length > 0) {
						if (table.id === 'eid_main_table') return;
						table.removeChild(table.tBodies[0])
					}

					var tblBody = document.createElement("tbody");
					table.appendChild(tblBody);

					if (dataset.foreign_key_field) {
						var parentKeyField = this.primary_dataset.dataset_content[this.record_position][dataset.parent_key_field];
						tableRows = dataset.dataset_content.filter(item => {
							return item[dataset.foreign_key_field] === parentKeyField
						});
					}
					else {
						tableRows = dataset.dataset_content;
					}

					tableRows.forEach((tableRow) => {
						var row = this.createTableRow(table, tableRow);
						tblBody.appendChild(row);
					});
				}
			}
		})
	}


	//=================================================================================
	createTableRow(table, json_table_row) { // ??
		var _row = document.createElement('tr');

		Array.from(table.getElementsByTagName('th')).forEach((header: HTMLInputElement) => {
			var _cell = document.createElement('td');
			_cell.style.cssText = 'margin: 0 !important; padding-right: 3px; padding-left: 3px; border: solid 1px gray; vertical-align: middle; background-color: white; color: black';
			var _label = document.createElement("Label");

			var bind = header.getAttribute('data-bind');
			if (bind && json_table_row[bind]) {
				_label.innerHTML = json_table_row[bind];
			}

			_cell.appendChild(_label);
			_row.appendChild(_cell);
		});

		return _row;
	}


	//=================================================================================
	getDataset(dataset_name) {
		if (this.datasets) {
			for (var gdi = 0; gdi < this.datasets.length; gdi++) {
				if (dataset_name === this.datasets[gdi].dataset_name) {
					return this.datasets[gdi];
				}
			}
		}

		return null;
	}


	//=================================================================================
	bindInputs() {
		Array.from(document.getElementsByTagName('input')).forEach((input) => {
			var bind = input.getAttribute('data-bind');
			if (bind) {
				var value = this.primary_dataset.dataset_content[this.record_position][bind];
				if (!value) value = '';

				if (input.type === 'checkbox') {
					input.value = value === "1" ? 'on' : 'off';
					input.checked = value === "1" ? true : false;
				}
				else {
					input.value = value;
				}
			}
		});
	}


	//=================================================================================
	bindPhones() {
		Array.from(document.querySelectorAll("[href*=tel]")).forEach((phone: HTMLBaseElement) => {
			var bind = phone.getAttribute('data-bind');
			if (bind) {
				phone.style.textAlign = localStorage.getItem('direction') === "ltr" ? "left" : "right";
				var value = this.primary_dataset.dataset_content[this.record_position][bind];
				if (value) {
					//phone.text = value;
					phone.innerHTML = value;
					phone.href = "tel:" + value;
				}
			}
		});
	}


	//=================================================================================
	bindAddresses() {
		Array.from(document.querySelectorAll("[href*=waze]")).forEach((address: HTMLBaseElement) => {
			var bind = address.getAttribute('data-bind');
			if (bind) {
				//address.style.textAlign = localStorage.getItem('direction') === "ltr" ? "left" : "right";
				var value = this.primary_dataset.dataset_content[this.record_position][bind];
				if (value) { // .css("text-align", "center");
					//address.text = value;
					address.innerHTML = value;
					address.href = "waze://?q=" + value;
				}
			}
		});
	}


	//=================================================================================
	setNavigationButtonsBehavior() {
		var prevButton = document.getElementById("eid_nav_prev");
		if (prevButton) (prevButton as HTMLInputElement).disabled = (this.record_position === 0);

		var nextButton = document.getElementById("eid_nav_next");
		if (nextButton) (nextButton as HTMLInputElement).disabled = (this.record_position >= this.primary_dataset.dataset_content.length - 1);
	}


	//=================================================================================
	public navigatePrev() {
		if (this.record_position === 0) return;

		if (!this.onAboutToNavigate()) return;

		this.record_position--;
		this.bindData();

		if (this.context &&
			typeof this.context.setMainTableCursor !== 'undefined' &&
			typeof this.context.setMainTableCursor === 'function') {
  			this.context.setMainTableCursor();
		}
	}


	//=================================================================================
	public navigateNext() {
		if (this.record_position >= this.primary_dataset.dataset_content.length - 1) return;

		if (!this.onAboutToNavigate()) return;

		this.record_position++;
		this.bindData();

		if (this.context &&
			typeof this.context.setMainTableCursor !== 'undefined' &&
			typeof this.context.setMainTableCursor === 'function') {
	  		this.context.setMainTableCursor();
		}
	}


	//=================================================================================
	confirmExit() {
		this.onAboutToNavigate()
	}


	//=================================================================================
	onNewRecordEvent() {
		if (!this.onAboutToNavigate()) return;

		this.createNewPrimaryRow();
		this.record_position = this.primary_dataset.dataset_content.length - 1;

		this.bindData();
	}


	//=================================================================================
	onDeleteRecordEvent() {
		if (this.primary_dataset.dataset_content[this.record_position].__State !== '1') {// Indicate new row
			var stmt = this.formSqlDeleteStmt();
			if (stmt === "") return;

			this.ufw.webRequest(null, null, "WebProcedure", this.primary_dataset.dataset_name, stmt);
		}

		this.primary_dataset.dataset_content.splice(this.record_position, 1);

		if (this.record_position >= this.primary_dataset.dataset_content.length - 1) {
			this.record_position = this.primary_dataset.dataset_content.length - 1;
		}

		this.bindData();
	}


	//=================================================================================
	onBackToCallerEvent() {
		if (!this.onAboutToNavigate()) return;

		var view_key_value = this.ufw.ugs.queryParam('parent_key_value');
		var parent_view = this.ufw.ugs.queryParam('parent_view');
		var view_tab = this.ufw.ugs.queryParam('parent_tab');

		var view_position = this.ufw.ugs.queryParam('parent_position');

		this.router.navigate([parent_view], {
			queryParams: {
				view_key_value, view_position, view_tab
			}
		});
	}


	//=================================================================================
	onRecordBeenModified() {
		if (!this.auto_update) {
			//this.ufw.ugs.Loger("*** Error: Record been modified with no auto update procedure", true);
			return;
		}

		var stmt = (this.primary_dataset.dataset_content[this.record_position]['__State'] === '1') ?
			this.formSqlInsertStmt() : this.formSqlUpdateStmt();
		if (stmt === "") return;
		this.ufw.webRequest(null, null, "WebProcedure", this.primary_dataset.dataset_name, stmt);
		this.primary_dataset.dataset_content[this.record_position]['__State'] = "0";
	}


	//=================================================================================
	onAboutToNavigate() {
		this.onCheckForChanges();
		return true;
	}


	//=================================================================================
	onCheckForChanges() {
		var inputs = document.querySelectorAll('input,ng-select');

		for (var ocfci = 0; ocfci < inputs.length; ocfci++) {
			var ui_element = inputs[ocfci];
			var field_name = ui_element.getAttribute('data-bind');

			if (field_name) {
				var field_type = this.primary_dataset.dataset_format[0][field_name];

				var record_value = this.primary_dataset.dataset_content[this.record_position][field_name];
				if (!record_value) record_value = '';

				var ui_value = this.getElementInputValue(ui_element);

				if (this.columnBeenModified(record_value, ui_value, field_type)) {
					this.onRecordBeenModified();
					break;
				}
			}
		}
	}


	//=================================================================================
	columnBeenModified(record_value, ui_value, field_type) {

		if (field_type === "String") {
			return (String(record_value) !== String(ui_value));
		}
		else if (field_type === "Int") {
			return (parseInt(record_value) !== parseInt(ui_value));
		}
		else if (field_type === "Boolean") {
			return (parseInt(record_value) !== parseInt(ui_value));
		}
		else if (field_type === "DateTime") {
			return (String(record_value) !== String(ui_value));
		}
		else if (field_type === "Time") {
			return (String(record_value) !== String(ui_value));
		}
		else if (field_type === "Real") {
			return (parseFloat(record_value) !== parseFloat(ui_value));
		}

		return false;
	}


	//=================================================================================
	formSqlUpdateStmt() {
		if (!this.checkForUpdateValidity()) return "";

		var modifiedColumns = "";
		for (var field_name in this.primary_dataset.dataset_format[0]) {
			if (field_name.startsWith("__")) continue;

			var ui_element = document.getElementById(field_name);
			if (!ui_element) continue;

			var field_type = this.primary_dataset.dataset_format[0][field_name];

			var record_value = this.primary_dataset.dataset_content[this.record_position][field_name];
			if (!record_value) record_value = '';

			var ui_value = this.getElementInputValue(ui_element);

			if (this.columnBeenModified(record_value, ui_value, field_type)) {
				this.primary_dataset.dataset_content[this.record_position][field_name] = ui_value;
				modifiedColumns += field_name + "=" + this.getSqlSyntaxColumnValue(ui_value, field_type) + ",";
			}
		}

		var where_stmt = this.formSqlWhereStmt();

    return `UPDATE ${this.primary_dataset.dataset_name} `
         + `SET ${this.ufw.ugs.rtrim(",", modifiedColumns)} `
         + `WHERE ${where_stmt}`;
	}


	//=================================================================================
	formSqlInsertStmt() {
		if (!this.checkForInsertValidity()) return "";

		var column_names = "", column_values = "";
		for (var field_name in this.primary_dataset.dataset_format[0]) {
			if (field_name.startsWith("__")) continue;

			if (this.isPrimaryKey(field_name)) continue;

			var field_type = this.primary_dataset.dataset_format[0][field_name];
			var ui_element: any = "";
			var ui_value: any = "";

			if (field_name === this.primary_dataset.foreign_key_field) {
				ui_value = this.primary_dataset.foreign_key_value;
			}
			else {
				ui_element = document.getElementById(field_name);
				if (ui_element) {
					ui_value = this.getElementInputValue(ui_element);
				}
			}

			this.primary_dataset.dataset_content[this.record_position][field_name] = ui_value;
			column_names += field_name + ",";
			column_values += this.getSqlSyntaxColumnValue(ui_value, field_type) + ",";
		}

    return `INSERT INTO ${this.primary_dataset.dataset_name} `
         + `(${this.ufw.ugs.rtrim(",", column_names)}) `
         + `VALUES(${this.ufw.ugs.rtrim(",", column_values)}`;
	}


	//=================================================================================
	formSqlDeleteStmt() {
		if (!this.checkForDeleteValidity()) return "";

		var where_stmt = this.formSqlWhereStmt();

    return `DELETE FROM ${this.primary_dataset.dataset_name} WHERE ${where_stmt}`;
	}


	//=================================================================================
	isPrimaryKey(field_name) {
		for (var ipki = 1; ; ipki++) {
			var primary_field_name = this.ufw.ugs.fieldByPosition(this.primary_dataset.primary_key_fields, ipki, "|");
			if (!primary_field_name) break;

			if (field_name === primary_field_name) return true;
		}

		return false;
	}


	//=================================================================================
	formSqlWhereStmt() {
		var where_stmt = "";
		for (var fswsi = 1; ; fswsi++) {
			var primary_field_name = this.ufw.ugs.fieldByPosition(this.primary_dataset.primary_key_fields, fswsi, "|");
			if (!primary_field_name) break;

			var primary_field_type = this.primary_dataset.dataset_format[0][primary_field_name];
			var primary_field_value = this.primary_dataset.dataset_content[this.record_position][primary_field_name];

			where_stmt += primary_field_name + "=" + this.getSqlSyntaxColumnValue(primary_field_value, primary_field_type) + " AND ";
		}

		if (where_stmt === "") where_stmt = "0=1";
		return this.ufw.ugs.rtrim(" AND ", where_stmt);
	}


	//=================================================================================
	checkForUpdateValidity() {
		if (!this.primary_dataset.dataset_name) {
			this.ufw.ugs.Loger("Error: No table Name", true);
			return false;
		}

		if (!this.primary_dataset.primary_key_fields) {
			this.ufw.ugs.Loger("Error: No primary key", true);
			return false;
		}

		return true;
	}


	//=================================================================================
	checkForInsertValidity() {
		if (!this.primary_dataset.dataset_name) {
			this.ufw.ugs.Loger("Error: No table Name", true);
			return false;
		}

		return true;
	}


	//=================================================================================
	checkForDeleteValidity() {
		if (!this.primary_dataset.dataset_name) {
			this.ufw.ugs.Loger("Error: No table Name", true);
			return false;
		}

		if (!this.primary_dataset.primary_key_fields) {
			this.ufw.ugs.Loger("Error: No primary key", true);
			return false;
		}

		return true;
	}


	//=================================================================================
	getSqlSyntaxColumnValue(raw_value, field_type) {

		if (field_type === "String") {
			return this.getSqlStringSyntax(String(raw_value));
		}
		else if (field_type === "Int") {
			return this.getSqlIntSyntax(String(raw_value));
		}
		else if (field_type === "Boolean") {
			return this.getSqlBoolSyntax(String(raw_value));
		}
		else if (field_type === "DateTime") {
			return this.getSqlDatetimeSyntax(String(raw_value));
		}
		//else if (field_type === "Time") {
		//  return this.getSqlTimeSyntax(String(raw_value));
		//}
		else if (field_type === "Real") {
			return this.getSqlRealSyntax(String(raw_value));
		}

		return this.getSqlStringSyntax(String(raw_value));   // on default (or unknown field type)
	}


	//=================================================================================
	getSqlStringSyntax(ui_value) {
		var return_value = ui_value.replace("'", "''").replace("\"", "\"\"").replace("\\", "\\\\");
		return "'" + return_value + "'";
	}


	//=================================================================================
	getSqlIntSyntax(ui_value) {
		var return_value = String(parseInt(ui_value ? ui_value : "0"));
		return return_value;
	}


	//=================================================================================
	getSqlDateSyntax(ui_value) {
		if (!ui_value) return "NULL";

		var momDate = moment(ui_value, ["DD-MM-YYYY", "MM-DD-YYYY", "YYYY-MM-DD"])
		var return_value = momDate.format('YYYY/MM/DD');

		return "'" + return_value + "'";
	}


	//=================================================================================
	getSqlDatetimeSyntax(ui_value) {
		if (!ui_value) return "NULL";

		var moment_date = moment(ui_value, ["DD-MM-YYYY", "MM-DD-YYYY", "YYYY-MM-DD"])
		var return_value = moment_date.format('YYYY/MM/DD hh:mm:ss');

		return "'" + return_value + "'";
	}


	//=================================================================================
	getSqlRealSyntax(ui_value) {
		var return_value = String(parseFloat(ui_value ? ui_value : "0"));
		return return_value;
	}


	//=================================================================================
	getSqlBoolSyntax(ui_value) {
		var return_value = String(parseInt(ui_value ? ui_value : "0") !== 0 ? "1" : "0");
		return return_value;
	}


	//==================================================================================
	matchStart(params, data) {
		params.term = params.term || '';
		if (data.text.toUpperCase().indexOf(params.term.toUpperCase()) === 0) {
			return data;
		}
		return false;
	}


	//=================================================================================
	public setNavigationBar(className) {
		if (!className) return;

		var direction = localStorage.getItem('direction');
		var prevIcon = direction == 'rtl' ? 'right' : 'left';
		var nextIcon = direction == 'rtl' ? 'left' : 'right';

		var plainHTML = "<div style='margin-top: 1.25vh;'>"
			+ "<div class='row form-group col-12'>"
			+ "<div class='col-4'>"
			+ "<div class='input-group'>"
			+ "<span class='input-group-addon'>"
			+ "<i class='nav_back fa fa-arrow-circle-" + prevIcon + "' aria-hidden='true'></i>"
			+ "</span>"
			+ "<input id='eid_nav_prev' type='button' class='btn btn-primary btn-block'"
			+ "style='color: white; font-size: .8rem;  max-height: 30px;'"
			+ "value='" + this.ufw.ugs.uTranslate('Previous') + "'/>"
			+ "</div>"
			+ "</div>"
			+ "<div class='col-4' style='text-align:center'>"
			+ "<input id='eid_nav_position' type='text' class='form-control' dir='ltr'"
			+ "style='font-size: .8rem;  font-weight: 700; max-height: 30px; text-align: center;' readonly>"
			+ "</div>"
			+ "<div class='col-4'>"
			+ "<div class='input-group'>"
			+ "<input id='eid_nav_next' type='button' class='btn btn-primary btn-block'"
			+ "style='color: white; font-size: .8rem;  max-height: 30px;'"
			+ "value='" + this.ufw.ugs.uTranslate('Next') + "'/>"
			+ "<span class='input-group-addon'>"
			+ "<i class='nav_forw fa fa-arrow-circle-" + nextIcon + "' aria-hidden='true'></i>"
			+ "</span>"
			+ "</div>"
			+ "</div>"
			+ "</div>"
			+ "</div>";

		$(className).append(plainHTML);

		$('#eid_nav_prev').on('click', this.navigatePrev.bind(this));
		$('#eid_nav_next').on('click', this.navigateNext.bind(this));
	}


	//=================================================================================
	getDatasetColumnValue(datasetName, rowNumber, columnName) {
		var dataset = this.getDataset(datasetName);
		if (!dataset || (dataset.dataset_content.length <= rowNumber)) return "";

		return dataset.dataset_content[rowNumber][columnName];
	}

  //=================================================================================
	getDatasetRow(datasetName, jsonKey, jsonValue) {
		var rows = this.getDatasetRowsArray(datasetName, jsonKey, jsonValue);
		return (rows.lenght == 0 ? '' : rows[0]);
	}

	//=================================================================================
	getDatasetRowsArray(datasetName, jsonKey, jsonValue) {
		var dataset = this.getDataset(datasetName);
		if (!dataset) return JSON.parse("[]");

		var tableRows = dataset.dataset_content.filter(item => {
			return item[jsonKey] === jsonValue;
		});

		return tableRows;
	}


	//==================================================================================
	checkForLegalIsraelIDCard(il_id) {
		var tot = 0;
		var tz = new String(il_id);

		while (tz.length !== 9) tz = "0" + tz;

		for (var i = 0; i < 8; i++) {
			var x = (((i % 2) + 1) * parseInt(tz.charAt(i)));
			if (x > 9) {
				x = x / 10 + x % 10;
			}

			tot += x;
		}

		if ((tot + parseInt(tz.charAt(8))) % 10 === 0) {
			return true;
		} else {
			return false;
		}
	}


	//==================================================================================
	checkForLegalEmail(str_email) {
		return ((str_email.length > 5) && (str_email.indexOf('@') > 0));
	}


	//==================================================================================
	checkForRequired(elm_id) {
		var ui_element = document.getElementById(elm_id) as HTMLInputElement;
		var ui_value = this.getElementInputValue(ui_element);
		//var ui_prompt = ui_element.getAttribute("placeholder");
		var ui_prompt = this.getElementInputLabel(ui_element);
    if (!ui_value) {
      this.ufw.ugs.Loger(`Error: ${this.ufw.ugs.msg_no_value}: ${ui_prompt}`, true);
			return false;
		}

		return true;
	}


	//==================================================================================
	checkForValidity(elm_id, validity_check) {
		var ui_element = document.getElementById(elm_id);
		var ui_value = this.getElementInputValue(ui_element);
		//var ui_prompt = ui_element.getAttribute("placeholder");
		var ui_prompt = this.getElementInputLabel(ui_element);

		if (!ui_value) return true;

		if (!validity_check(ui_value)) {
      this.ufw.ugs.Loger(`Error: ${this.ufw.ugs.msg_illegal_value}: ${ui_prompt}`, true);
			return false;
		}

		return true;
	}


	//==================================================================================
	checkForLegalPhoneNumber(eid_ac, eid_pn) {
		var elm_area_code = document.getElementById(eid_ac);
		var elm_phone_number = document.getElementById(eid_pn);

		var area_code = this.getElementInputValue(elm_area_code);
		var phone_number = this.getElementInputValue(elm_phone_number);

		//var ac_prompt = elm_area_code.getAttribute("placeholder");
		var ac_prompt = this.getElementInputLabel(elm_area_code);

		//var pn_prompt = elm_phone_number.getAttribute("placeholder");
		var pn_prompt = this.getElementInputLabel(elm_phone_number);

		if (phone_number) {
			if (phone_number.length !== 7) {
				this.ufw.ugs.Loger(`Error: ${this.ufw.ugs.msg_illegal_value}: ${pn_prompt}`, true);
				return false;
			}
		}

		if (area_code && !phone_number) {
      this.ufw.ugs.Loger(`Error: ${this.ufw.ugs.msg_no_value}: ${pn_prompt}`, true);
			return false;
		}

		if (!area_code && phone_number) {
      this.ufw.ugs.Loger(`Error: ${this.ufw.ugs.msg_no_value}: ${ac_prompt}`, true);
			return false;
		}

		return true;
	}


	//==================================================================================
	getElementInputValue(ui_element) {
		var ui_value = (ui_element as HTMLInputElement).value;

		if (ui_element.tagName.toLowerCase() === 'ng-select') {
			ui_value = this.context.getSelectedValue(ui_element.id);
		}
		if ((ui_element as HTMLInputElement).type === 'checkbox') {
			ui_value = ((ui_element as HTMLInputElement).checked) ? "1" : "0";
		}

		return ui_value;
	}


	//==================================================================================
	getElementInputLabel(ui_element) {
		var ui_label = ui_element.getAttribute("placeholder");

		if (ui_element.tagName.toLowerCase() === 'ng-select') {
			ui_label = this.context.getSelectedLabel(ui_element);
		}

		return ui_label;
	}
}
