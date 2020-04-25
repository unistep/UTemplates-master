
import { Component, AfterViewInit, Injector, OnDestroy } from '@angular/core';
import { BaseFormComponent } from '../../../../angular-toolkit/src/public-api';

import * as $ from 'jquery';

import * as moment from 'moment';

@Component({
	selector: 'app-service-call',
	templateUrl: './service-call.component.html',
	styleUrls: ['./service-call.component.scss']
})

export class ServiceCallComponent  extends BaseFormComponent implements AfterViewInit, OnDestroy {

	month: any = [];
	selectedMonth: any;

	year: any = [];
	selectedYear: any

	initDone: boolean = false;

	constructor(injector: Injector) {
		super(injector);

		this.http.get<any>(this.ugs.ufw_url + 'ServiceCall').subscribe(result => {
			this.getFormData(result, false);
		}, error => this.ugs.Loger(error));

		var id, name;
		for (var i = 0; i < 8; i++) { id = name = (i + moment().year()); this.year.push({ id, name }) }
		for (var i = 1; i <= 12; i++) { id = name = i; this.month.push({ id, name }) }

		this.year.splice(0, 0, { id: '', name: this.ugs.uTranslate("Year") });
		this.month.splice(0, 0, { id: '', name: this.ugs.uTranslate("Month") });
		this.selectedYear = this.year[0];
		this.selectedMonth = this.month[0];
	}


  	ngAfterViewInit(): void {
		super.setsScreenProperties();
		$(document).find('li.servicecall')[0].style.display = "none";
	}


	//=================================================================================
	ngOnDestroy(): void {
		$(document).find('li.servicecall')[0].style.display = "block";
	}


	//=================================================================================
	public getFormData(scData, autoUpdate) {

		this.udb.view_key_value = this.ugs.queryParam("view_key_value");
		this.udb.record_position = parseInt(this.ugs.queryParam("view_position"));
		this.udb.view_tab = parseInt(this.ugs.queryParam("view_tab"));

		if (!this.udb.record_position || (this.udb.record_position < 0)) this.udb.record_position = 0;
		if (!this.udb.view_tab || (this.udb.view_tab < 0)) this.udb.view_tab = 0;

		super.formInit(scData, autoUpdate, ".rframe");

		var self = this;

		if (this.udb.view_tab) this.udb.selectTab('.nav-tabs', this.udb.view_tab);

		$('#eid_cart_table').on('click', 'tr', this.doShoppingCart.bind(this));

		$('input.clicked[type="button"]').on('click', this.serviceCallStep.bind(this));

		$('.nav li').click(function ($event) {
			event.preventDefault();

			var el: any = this;
			for (var tab = 1; el = el.previousElementSibling; tab++);

			self.udb.selectTab('.nav-tabs', tab);
		});

		$('.cameraFrame').click(function ($event) {
			var callerInput = this.getElementsByTagName('input')[0];
			if (callerInput == null) return;

			callerInput.click();
		});

		$('.cameraFrame input').change(function ($event) {
			var file = (this as any).files[0];
			if (!file) return;

			var callerCam = this.parentElement;
			var callerImage = callerCam.getElementsByTagName('div')[0];
			var callerFa = callerCam.getElementsByTagName('i')[0];

			callerFa.style.display = 'none';
			callerImage.style.display = 'block';

			var reader = new FileReader();
			reader.onloadend = function () {
				callerImage.style.background = 'url("' + reader.result + '")';
				callerImage.style.backgroundSize = "cover";
			}

			reader.readAsDataURL(file);
			var remoteFileName = this.getAttribute('data-file');
			var remoteFilePath = self.udb.primary_dataset.dataset_content[self.udb.record_position]['Files_Folder'] + '/' + remoteFileName;
			self.ufw.uploadFile(file, remoteFilePath);
		});
	}


	//=================================================================================
	afterBinding() {
		var source = this.udb.primary_dataset.dataset_content[this.udb.record_position].Source_Latlng;
		this.gmaps.mapDrawRoute(source);

		this.setTotalPayment();
		this.setCreditTransactionElements();
	}


	//=================================================================================
	serviceCallStep() {
		var elmInput = $(":input")[$(":input").index(document.activeElement) + 1] as HTMLInputElement;

		if (!elmInput.value)
			elmInput.value = moment().format('YYYY/MM/DD HH:mm');
		else
			elmInput.value = '';

		if (elmInput.id !== "On_My_Way_Time") return;

		if (!elmInput.value) {
			this.sendArrivalCancel_SMS();
			return;
		}

		this.sendOnMyWay_SMS(); // NEW
	}


	//=================================================================================
	sendArrivalCancel_SMS() {
		const recipient = "0544719547";
		// recipient = this.udb.primary_dataset.dataset_content[this.udb.record_position].Contact_Phone_1;
		const message = this.ugs.uTranslate("SMS_Arrival_Cancelled")
		.replace("000", this.udb.primary_dataset.dataset_content[this.udb.record_position].Vehicle_ID);
		this.ufw.SendSMS(recipient, message);
	}


	//=================================================================================
	sendOnMyWay_SMS() {
		const recipient = "0544719547";
		// recipient = this.udb.primary_dataset.dataset_content[this.udb.record_position].Contact_Phone_1;
		const message = this.ugs.uTranslate("SMS_On_My_Way")
		.replace("000", this.udb.primary_dataset.dataset_content[this.udb.record_position].Vehicle_ID)
		.replace("111", this.gmaps.duration);
		this.ufw.SendSMS(recipient, message);
	}


	//=================================================================================
	doShoppingCart(event) {
		var view_key_value = this.udb.primary_dataset.dataset_content[this.udb.record_position]['Work_Order_PKey'];
		var view_position = (event.currentTarget.rowIndex - 1).toString();
		var parent_key_value = this.udb.view_key_value;
		var parent_view = 'service-call';
		var parent_position = this.udb.record_position.toString();
		var parent_tab = '5';

		this.router.navigate(['shopping-cart'], {
			queryParams: {
				view_key_value, view_position, parent_key_value, parent_view, parent_position, parent_tab
			}
		});
	}


	//=================================================================================
	public async doCreditPayment() {
		const uiConfNo = document.getElementById("eid_confirmation_number") as HTMLInputElement;
		let confNo = this.udb.getElementInputValue(uiConfNo);
		if (confNo) return;

		uiConfNo.value = confNo = "";

		if (!this.validateCreditTransactionElements()) return;

		const cardNumber	= this.udb.getElementInputValue(document.getElementById('eid_card_number')); // "4580170000827965"; //
		const firstName		= this.udb.getElementInputValue(document.getElementById('eid_card_first_name')); // "שלמה"; //
		const lastName		= this.udb.getElementInputValue(document.getElementById('eid_card_last_name')); // "אביב"; //
		let expiredYear			= this.udb.getElementInputValue(document.getElementById('eid_expiration_year')).toString();
		expiredYear = expiredYear.substring(2, 4);
		let expiredMonth			= this.udb.getElementInputValue(document.getElementById('eid_expiration_month')).toString();
		while (expiredMonth.length < 2) expiredMonth = "0" + expiredMonth;

		const cvv			= this.udb.getElementInputValue(document.getElementById('eid_cvv_code')); // "587"; //
		const holderID		= this.udb.getElementInputValue(document.getElementById('eid_id_number')); // "054572904"; //

		//const billAmount	= $("#eid_total_payment").val();
		const billAmount	= "1";
		const payments		= "1";

		const transType = "CreditPayment"; // "AuthorizeCredit"

		const response: any = await this.ufw.CreditAction(transType, holderID, cardNumber, expiredYear, expiredMonth,
							billAmount, payments, cvv, holderID, firstName, lastName);

		if (!response) return;

		const confirmed = response.confirmationNo;
		const issuerID = response.issuerID;
		const terminalID = response.TerminalID;
		const rExpired = response.expired;

		const message = this.ugs.uTranslate("Ccard_Successfully_Confirmed")
			+ `: ConfirmatioNo=${confirmed} issuer=${issuerID}, terminal=${terminalID}, expired=${rExpired}`;

		this.ugs.Loger(message, true);

		uiConfNo.value = confirmed;

		this.setCreditTransactionElements();
	}


	//=================================================================================
	validateCreditTransactionElements() {
		if (!this.udb.checkForRequired('eid_card_number')) return false;
		if (!this.udb.checkForRequired('eid_card_first_name')) return false;
		if (!this.udb.checkForRequired('eid_card_last_name')) return false;
		if (!this.udb.checkForRequired('eid_expiration_month')) return false;
		if (!this.udb.checkForRequired('eid_expiration_year')) return false;
		if (!this.udb.checkForRequired('eid_cvv_code')) return false;
		if (!this.udb.checkForValidity('eid_id_number', this.udb.checkForLegalIsraelIDCard)) return false;

		if (!$("#eid_total_payment").val()) {
			this.ugs.Loger(this.ugs.uTranslate("msg_no_value") + ": " + this.ugs.uTranslate("Total_Payment"), true);
			return false;
		}

		return true;
	}


	//=================================================================================
	setCreditTransactionElements() {
		var elm_isConfirmed = document.getElementById('eid_confirmation_number');
		if (!elm_isConfirmed) return;

		var isConfirmed = (elm_isConfirmed as HTMLInputElement).value ? true : false;

		(document.getElementById('eid_card_number') as HTMLInputElement).readOnly = isConfirmed;
		(document.getElementById('eid_card_first_name') as HTMLInputElement).readOnly = isConfirmed;
		(document.getElementById('eid_card_last_name') as HTMLInputElement).readOnly = isConfirmed;
		(document.getElementById('eid_cvv_code') as HTMLInputElement).readOnly = isConfirmed;
		(document.getElementById('eid_id_number') as HTMLInputElement).readOnly = isConfirmed;
		(document.getElementById('eid_btn_payment') as HTMLInputElement).disabled = isConfirmed;
		(document.getElementById('eid_total_payment') as HTMLInputElement).disabled = true;

		document.getElementById("eid_expiration_month").style.backgroundColor = isConfirmed ? "lightgray" : "white";
		document.getElementById("eid_expiration_year").style.backgroundColor = isConfirmed ? "lightgray" : "white";
		document.getElementById("eid_btn_payment").style.backgroundColor = isConfirmed ? "lightgray" : "#007bff";
	}


	//=================================================================================
	setTotalPayment() {
		var dataset = this.udb.getDataset("VU_Cart_Detail_Line_Extended");
		if (!dataset) return;

		var tableRows = this.udb.getDatasetRowsArray("VU_Cart_Detail_Line_Extended",
			dataset.foreign_key_field,
			this.udb.primary_dataset.dataset_content[this.udb.record_position][dataset.parent_key_field]);

		var total_payment = 0;
		for (var i = 0; i < tableRows.length; i++) {
			total_payment += parseFloat(tableRows[i].Cart_Row_Total_Price);
		}

		$("#eid_total_payment").val(total_payment.toLocaleString('he', { style: 'currency', currency: 'ILS' }));
	}


	//=================================================================================
	public getSelectedValue(eid_element) {
		if (eid_element == 'eid_expiration_month')
			return (this.selectedMonth ? this.selectedMonth.id : '');

		if (eid_element == 'eid_expiration_year')
			return (this.selectedYear ? this.selectedYear.id : '');

		return '';
	}


	//=================================================================================
	public getSelectedLabel(eid_element) {
		if (eid_element.id == 'eid_expiration_month')
			return (this.month ? this.month[0].name : '');

		if (eid_element.id == 'eid_expiration_year')
			return (this.year ? this.year[0].name : '');

		return '';
	}
}
