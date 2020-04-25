
import { Component, Injector, AfterViewInit, OnDestroy } from '@angular/core';

import { BaseFormComponent } from '../../../../angular-toolkit/src/public-api';
import * as $ from 'jquery';

@Component({
	selector: 'app-shopping-cart',
	templateUrl: './shopping-cart.component.html',
	styleUrls: ['./shopping-cart.component.scss']
})

export class ShoppingCartComponent extends BaseFormComponent implements AfterViewInit, OnDestroy {

	public productFamily: any = [];
	public selectedProductFamily: any;

	public product: any = [];
	public selectedProduct: any;

	constructor(injector: Injector) {
		super(injector);

		this.udb.record_position = parseInt(this.ugs.queryParam("view_position"));

		this.http.get<any>(this.ugs.ufw_url + 'ShoppingCart?view_key_value=' + this.ugs.queryParam("view_key_value")).subscribe(result => {
			this.getShoppingCartData(result);
		}, error => this.ugs.Loger(error));
	}


	ngAfterViewInit(): void {
		super.setsScreenProperties();
		//$(document).find('li.servicecall')[0].style.display = "none";
	}
	

	//=================================================================================
	ngOnDestroy(): void {
		this.udb.confirmExit();
		//$(document).find('li.servicecall')[0].style.display = "block";
	}

	//=================================================================================
	public getShoppingCartData(scData) {
		var self = this;
		this.udb.prepareDatasets(scData);
		this.udb.auto_update = true; // Binding procedure should sync data with server

		var dataset = this.udb.getDataset(document.getElementById('Product_Family_ID').getAttribute('data-dataset'));
		this.productFamily = dataset.dataset_content;
		var name = this.ugs.uTranslate("Product_Family");
		this.productFamily.splice(0, 0, { id: '', name });

		this.udb.setNavigationBar('.main_frame');
		this.udb.bindData(this);

		this.ugs.setsScreenProperties();

		$("#Product_Sale_Price").change(this.productSalePriceChanged.bind(this));
		$("#Product_Sale_Quantity").change(this.productSalePriceChanged.bind(this));
		$("#Product_Sale_Price").attr("readonly", false);
		$("#Product_Sale_Quantity").attr("readonly", false);
	}


	//=================================================================================
	public getFormData(scData, autoUpdate) {

		super.formInit(scData, autoUpdate, ".rframe");

		$("#Product_Sale_Price").change(this.productSalePriceChanged.bind(this));
		$("#Product_Sale_Quantity").change(this.productSalePriceChanged.bind(this));
		$("#Product_Sale_Price").attr("readonly", false);
		$("#Product_Sale_Quantity").attr("readonly", false);
	}


	//=================================================================================
	afterBinding() {
		var cartRow = this.udb.primary_dataset.dataset_content[this.udb.record_position];
		var productRow = this.udb.getDatasetRow('Product', 'id', cartRow.Product_ID)

		if (!productRow) this.selectedProductFamily = this.productFamily[0]; 
		else this.selectedProductFamily = this.udb.getDatasetRow('Product_Family', 'id', productRow.Product_Family_ID);
		this.productFamilyChanged(null);

		if (!productRow) this.selectedProduct = this.product[0];
		else this.selectedProduct = this.udb.getDatasetRow('Product', 'id', productRow.id);
		this.productChanged(null);
	}


	//=================================================================================
	productFamilyChanged(event) {
		var productFamilyID = (this.selectedProductFamily ? this.selectedProductFamily.id : '');
		this.product = this.udb.getDatasetRowsArray('Product', 'Product_Family_ID', productFamilyID);
		var name = this.ugs.uTranslate("Product");
		this.product.splice(0, 0, { id: '', name });
	}


	//=================================================================================
	productChanged(event) {
		$('#Product_ID').val(!this.selectedProduct ? '' : this.selectedProduct.id);
		$('#Product_Unit_Price').val(!this.selectedProduct ? '0.00' : this.selectedProduct.Product_Unit_Price);

		if (this.udb.on_binding) return;

		$('#Product_Sale_Price').val(!this.selectedProduct ? '0.00' : this.selectedProduct.Product_Unit_Price);
		$('#Product_Sale_Quantity').val('1');
		$('#Cart_Row_Total_Price').val(!this.selectedProduct ? '0.00' : this.selectedProduct.Product_Unit_Price);
	}


	//=================================================================================
	productSalePriceChanged() {
		var productSalePrice = $("#Product_Sale_Price").val();
		if (!productSalePrice) {
			productSalePrice = $("#Product_Unit_Price").val();
			$("#Product_Sale_Price").val(productSalePrice);
		}

		var productSaleQuantity = $("#Product_Sale_Quantity").val();
		if (!productSaleQuantity) {
			productSaleQuantity = "1";
			$("#Product_Sale_Quantity").val(productSaleQuantity);
		}

		const totalAmount = (productSaleQuantity * productSalePrice);

		$("#Cart_Row_Total_Price").val(totalAmount.toLocaleString('he', { style: 'currency', currency: 'ILS' }));
	}


	//=================================================================================
	public getSelectedValue(eid_element) {
		if (eid_element == 'Product_Family_ID')
			return (this.selectedProductFamily ? this.selectedProductFamily.id : '');

		if (eid_element == 'Product_Desc')
		return (this.selectedProduct ? this.selectedProduct.id : '');

		return '';
	}


	//=================================================================================
	public setSelectedValue(eid_element, itemID) {
		if (eid_element == 'Product_Family_ID')
			this.selectedProductFamily = this.product.filter(function (item) { return item.id === itemID; })[0];

		if (eid_element == 'Product_Desc')
			this.selectedProduct = this.productFamily.filter(function (item) { return item.id === itemID; })[0];
	}


	public getSelectedLabel(eid_element) {
		if (eid_element.id == 'Product_Family_ID')
			return (this.productFamily ? this.productFamily[0].name : '');

		if (eid_element.id == 'Product_Desc')
			return (this.product ? this.product[0].name : '');

		return '';
	}


	//=================================================================================
	public setSelectionList(element, datasetName) {
		if (element.id != 'Product_Family_ID') return;

		var dataset = this.udb.getDataset(datasetName);
		this.productFamily = dataset.dataset_content;
		var name = this.ugs.uTranslate('Product_Family');
		this.productFamily.splice(0, 0, { id: '', name });
	}
}
