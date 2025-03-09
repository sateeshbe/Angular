import { Component, OnInit, Input, Output, EventEmitter, ViewChild, TemplateRef, ElementRef} from '@angular/core';
import { FormControl, FormGroup,FormArray, FormBuilder, Validators } from '@angular/forms';
import { HttpClient, HttpEventType, HttpParams } from '@angular/common/http';
import { BehaviorSubject, interval, merge, Observable, of, OperatorFunction, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, tap, switchMap, takeUntil, concatMap, take, takeWhile, mergeMap } from 'rxjs/operators';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { DatePipe, JsonPipe, NgIf } from '@angular/common';
import { ActionItemsService } from 'src/app/action-items/action-items.service';
import { PayerImportDetails, UsersListValid, assignToUser, updateValidDetails } from 'src/app/action-items/art-interface/common';
import { ArtCommonService } from 'src/app/art-common/art-common.service';
import { Subscription } from 'rxjs';
import { ART_CONSTANTS } from 'src/app/models/constant';
import { environment } from 'src/environments/environment';
import { ArtFileUploadService } from 'src/app/action-items/art-RR-common/art-file-upload/art-file-upload.service';
import { NgbModal, ModalDismissReasons, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { cloneGenerate } from 'src/app/action-items/art-interface/common';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { PayerImportService } from 'src/app/action-items/art-payer-Import/payer-import.service';
import { externalSubmissionCreate,UsersList } from 'src/app/models/models';
import { ExternalSubmissionService } from 'src/app/external-submission/external-submission.service';
import { formatDate } from '@angular/common';
import * as moment from 'moment';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DateTime} from 'luxon';



@Component({
  selector: 'app-external-submission-create',
  templateUrl: './external-submission-create.component.html',
  styleUrls: ['./external-submission-create.component.scss']
})
export class ExternalSubmissionCreateComponent {
  submissionDetailForm: FormGroup;
  model:externalSubmissionCreate;
  ExternalSubTeam:any = [];
  IntakeSourceDrp:any;
  IssueTypeDrp:any;
  IssueTypeDrpData:any;
  IntakeSourceData: any;
  ClaimVolumeDrp:any;
  IssueReasonData:any;
  ExternalContactType:any;
  LineOfBusinessDrp:any
  ActionItemType:any
  MedicareEscalation:any
  subscription1: Subscription;
  subscription2: Subscription;
  displayRootCause:boolean;
  displayRootCauseTable:boolean=false;
  public invoiceForm: FormGroup;
  tableArr = [];
  isValidationFlag = false;
  isPercentage = false;
  isDisabled =true;
  isCommercial:boolean;
  isDigital:boolean;
  isMedicare:boolean;
  isPayer:boolean;
  isCignaOscar:boolean;
  teamDrpValue:any;
  CommentsTxt:any;
  IntakeSourceCommercial:any;
  IntakeSourceRoster:any;
  IntakeSourceClaimRR:any;
  IntakeSourcePayerSolution:any;
  IntakeSourceMedicare:any;
  IntakeSource:any;
  IssueReasonDrp:any;
  ContactTypeDrp:any;
  isVms:boolean;
  teamId:any;
  ActionItemLatePaymentInterestDrp:any;
  ProviderTypeDrp:any;
  
  private _value: any;
  showDialog: boolean = false;
  showAttachmentTab: boolean= false;
  isExternalSubmissionCreatePg: boolean = false;
  CignaRecvyesterday: any;
  LastRequestedFollowUpDateYes : any;
  FollowUpDateYes: any;
  providerId: any;
  nonPar: boolean;
  actionItemId: any;
  clonedData: any;
  isReloaded: boolean;
  isCloned: boolean =false;
  public countryList = new BehaviorSubject([])
  ExternalSubmissionIntakeSourceOther: any = null;
  globalGroupName: any;
  prdsDetails: any;
  

  constructor(
    private actionItemsService: ActionItemsService,
    private artCommonService: ArtCommonService,
    private _messageService: MessageService,
    private payerImportService: PayerImportService,
    private artFileUploadService: ArtFileUploadService,
    private modalService: NgbModal,
    private _sharedService: ArtCommonService,
    private _datePipe: DatePipe,
    private el :ElementRef,
    private confirmationService: ConfirmationService,
    private router :Router,
    private _actRoute: ActivatedRoute,
    public externalSubmissionService: ExternalSubmissionService,private _fb: FormBuilder,
    private messageService: MessageService, private _router: Router) {
      this.model = {} as externalSubmissionCreate;
      this.isCommercial= false;
      this.isDigital= false;
      this.isMedicare= false;
      this.isPayer= false;
      this.isCignaOscar= false;
      this.teamDrpValue="";
      this.isVms =false;
      this.teamId ="";
      const containsKeyword = window.location.href.includes('ExternalSubmission'); 
      this.isExternalSubmissionCreatePg = containsKeyword;
      console.log(this.externalSubmissionService.prdsDetails);
    }

    ngOnInit(): void {
      this._actRoute.queryParams.subscribe((param) => {
        this.providerId = param['id'] || null;
        this.nonPar = param['nonPar'] === 'true';
        this.externalSubmissionService.providerId=this.providerId;
        this.externalSubmissionService.nonPar=this.nonPar;
      });
      this.actionItemId = this.externalSubmissionService.actionItemId;
      this.isCloned =this.externalSubmissionService.isCloned;
     
      let currentDate =moment().format('YYYY-MM-DD');
      currentDate =currentDate +' '+'00:00:00';
      let login = this.artCommonService.getLoggedUsr();
      this.model.CreatedBy= login.login.toUpperCase();
      this.model.CreatedDate= currentDate;
      this.model.ProviderId=  this.providerId;
      this.model.ProviderNonParId= null
      this.model.LastModified= currentDate;
      this.model.LastModifiedBy= login.login.toUpperCase();
      this.model.Requestor= login.login.toUpperCase();
      let user = this.artCommonService.getUserProfileData();
      if(user.globalGroup === 'G_ART_VMS_USER' || user.oktaGG.includes('G_ART_VMS_USER')) {
        this.isVms = true;
        // console.log('is vms');
      } else {
        this.isVms = false;
        // console.log('not vms');
      }
      this.buildForm(); 
      if(!this.isCloned){
        this.invoiceForm = this._fb.group({
          Rows: this._fb.array([this.initRows()])
        });
        this.tableArr.push({ isEdit: true });
      }
      
      this.subscription1 = this.externalSubmissionService.getExternalDrpObserable().subscribe((message :any)=> {
        if (message && message.flag) {
          this.ExternalSubTeam = this.externalSubmissionService.ExternalSubTeam;
          this.externalSubmissionService.prdsDetails.subscribe((res) => {
            this.prdsDetails = res;
           if(this.prdsDetails != null){
            for (let i = 0; i < this.ExternalSubTeam.length; i++) {
              let VendorID = this.ExternalSubTeam.findIndex((val) => val.Id == 2);
              let Tooltip ='If a Vendor is selected the submission MUST be routed to "Vendor - National Ancillary Engagement Team" (in the drop-down Team value.  If any other provider is selected, the item cannot be routed to "Vendor - National Ancillary Engagement Team"';
              if (this.prdsDetails?.IsNonPar && this.prdsDetails?.CpfId == "VENDOR") {
                if (VendorID != -1 && this.ExternalSubTeam[i].Id == 2) {
                  this.ExternalSubTeam[VendorID].disabled = false;
                  this.ExternalSubTeam[VendorID].Tooltip = '';
                }else{
                  this.ExternalSubTeam[i].disabled = true;
                  this.ExternalSubTeam[i].Tooltip = Tooltip;
                }
              } else if (!this.prdsDetails?.IsNonPar) {
                this.ExternalSubTeam[VendorID].disabled = true;
                this.ExternalSubTeam[VendorID].Tooltip = Tooltip;
                if(this.ExternalSubTeam[i].Id != 2){
                  this.ExternalSubTeam[i].disabled = false;
                  this.ExternalSubTeam[i].Tooltip = '';
                }
              }
            }
           }
          });
          this.LineOfBusinessDrp = this.externalSubmissionService.ActionItemLineOfBusiness;
          this.IssueTypeDrpData = this.externalSubmissionService.IssueTypeWithCurrentGG;
          this.IssueReasonData = this.externalSubmissionService.IssueReason;
          this.ClaimVolumeDrp = this.externalSubmissionService.ClaimVolume;
          this.MedicareEscalation = this.externalSubmissionService.MedicareEscalation;
          this.ActionItemType = this.externalSubmissionService.ActionItemType;
          this.IntakeSourceCommercial =this.externalSubmissionService.IntakeSourceCommercial;
          this.IntakeSourceRoster =this.externalSubmissionService.IntakeSourceRoster;
          this.IntakeSourcePayerSolution =this.externalSubmissionService.IntakeSourcePayerSolution;
          this.IntakeSourceClaimRR =this.externalSubmissionService.IntakeSourceClaimRR;
          this.IntakeSourceMedicare =this.externalSubmissionService.IntakeSourceMedicare;
          this.IssueReasonDrp = [];
          this.IntakeSourceData = this.externalSubmissionService.IntakeSourceWithCurrentGG;
          this.ContactTypeDrp= this.externalSubmissionService.ExternalContactType;
          this.ActionItemLatePaymentInterestDrp =this.externalSubmissionService.ActionItemLatePaymentInterest;
          this.ProviderTypeDrp =this.externalSubmissionService.ProviderType;
          if(this.isCloned){
            this.subscription2 = this.externalSubmissionService.getClonedObserable().subscribe((msg :any)=> {
              if (msg && msg.flag) {
                this.clonedData = this.externalSubmissionService.mainPageData;
                this.setClonedValuesForFormData();
              }
            });
          }
        }
      });
      
      
    }

    findDrpDownValueByName(dropdownData: any,fieldName){
      let filteredDropdown = dropdownData.find((val)=> val.Title == fieldName);
      return filteredDropdown ;
    }

    convertToInt(arrayData: any){
      if(arrayData != '' && Array.isArray(arrayData)){
        arrayData.map((val)=>{
          let data = Number(val.Id);
          return {data,...val}
        });
      }
      return arrayData;
    }

 
    set Value(val: any) {
      this._value = val;
    }
    get Value(): string {
      return this._value;
    }

    buildForm() {
      let login = this.artCommonService.getLoggedUsr();
      const formGroupFields = this.getFormControlsFields();
      this.CignaRecvyesterday = moment().format('MM/DD/YYYY') + ' '+'00:00:00';
      this.submissionDetailForm = new FormGroup(formGroupFields);
      this.submissionDetailForm.patchValue({
        HcpStartDate:this.dateCovert(new Date()),
        HcpReceivedDate:this.dateCovert(new Date()),
        ActionItemStatusId: 4,
        CreatedBy:login.preferred_username,
        CreatedDate: this.dateCovert(new Date()),
        ActionItemEntityId:3,
        Guid:this.generateUUID().toLowerCase(),
        nonPar:this.nonPar,
        ExternalNotifyOnClose:'true',
        CignaReceivedDate: this.CignaRecvyesterday,
        ActionItemTypeId: 2,
      });
    }

    setClonedValuesForFormData(){
     setTimeout(() => {
      this.submissionDetailForm.patchValue({
        ValidationTeam:this.findDrpDownValueByName(this.ExternalSubTeam,this.clonedData?.Team)?.Id,
      });
      this.onChangeValue('');
      this.submissionDetailForm.patchValue({
        ActionItemIssueTypeId:this.findDrpDownValueByName(this.IssueTypeDrp,this.clonedData?.IssueType)?.Id,
      });
      this.teamId = this.findDrpDownValueByName(this.ExternalSubTeam,this.clonedData?.Team)?.Id;
      if(this.teamId == 6){
        this.externalSubmissionService.PayerResolutionTab = true;
      }else{
        this.externalSubmissionService.PayerResolutionTab = false;
      }

      if(this.clonedData?.Contact != null  && Array.isArray(this.clonedData?.Contact)){
        this.setInitialValues(this.clonedData?.Contact);
      }
      // const PayerSolutionTab = document.getElementById("PayerSolutions") as HTMLElement;
      // PayerSolutionTab.click();
      // ediData.click();
      this.onChangeIssues('');
      this.submissionDetailForm.patchValue({
        Name:this.clonedData?.ActionItemName,
        ActionItemLineOfBusinessId:this.findDrpDownValueByName(this.LineOfBusinessDrp,this.clonedData?.LineOfBusiness)?.Id,
        ActionItemIntakeSourceId:this.findDrpDownValueByName(this.IntakeSource,this.clonedData?.IntakeSource)?.Id,
        ActionItemIssueTypeId:this.findDrpDownValueByName(this.IssueTypeDrp,this.clonedData?.IssueType)?.Id,
        ActionItemIssueReasonId:this.findDrpDownValueByName(this.IssueReasonDrp,this.clonedData?.IssueReason)?.Id,
        ActionItemTypeId:this.findDrpDownValueByName(this.ActionItemType,this.clonedData?.Team)?.Id,
        CignaReceivedDate:this.clonedData?.CignaReceivedDate,
        CHCPUserId:this.clonedData?.CHCPUserId,
        NavinetUserId:this.clonedData?.NavinetUserId,
        Requestor:this.findDrpDownValueByName(this.MedicareEscalation,this.clonedData?.MedicareEscalation)?.Id,
        ClaimVolume:this.findDrpDownValueByName(this.ClaimVolumeDrp,this.clonedData?.ClaimVolume)?.Id,
        Escalated:this.clonedData?.IsEscalated,
        SlaDays:this.clonedData?.SlaDays,
        HcpType:this.findDrpDownValueByName(this.ProviderTypeDrp,this.clonedData?.HcpType)?.Id,
        LatePaymentInterest:this.findDrpDownValueByName(this.ActionItemLatePaymentInterestDrp,this.clonedData?.LatePaymentInterest)?.Id,
        ExternalNotifyOnClose:this.clonedData?.ExternalNotifyOnClose,
      });

       
      setTimeout(() => {
        this.submissionDetailForm.patchValue({
          ActionItemIssueReasonId:this.findDrpDownValueByName(this.IssueReasonDrp,this.clonedData?.IssueReason)?.Id,
        });
        const ediData = document.getElementById("defaultOpen") as HTMLElement;
        ediData.click();
      }, 200);
      this.CommentsTxt = this.clonedData?.InternalComments;
     }, 500);
    }

    generateUUID() {
      const { v4: uuidv4 } = require('uuid');
      return uuidv4().toLowerCase();
    }

    getFormControlsFields() {
      const formGroupFields = {
        Guid: new FormControl(this.model.Guid, []),
        //Name:new FormControl(this.model.Name, []),
        Name: new FormControl(this.model.Name, [Validators.required]),
        ExternalNotifyOnClose:new FormControl(this.model.ExternalNotifyOnClose, []),
        ActionItemLineOfBusinessId:new FormControl(this.model.ActionItemLineOfBusinessId, []),
        //ActionItemIssueReasonId:new FormControl(this.model.ActionItemIssueReasonId, []),
        ActionItemIssueTypeId:new FormControl('', [Validators.required]),
        ActionItemIssueReasonId: new FormControl('', [Validators.required]),
        ActionItemTypeId: new FormControl('', []),
        CignaReceivedDate:new FormControl(this.model.CignaReceivedDate, [Validators.required]),
        CHCPUserId:new FormControl(this.model.CHCPUserId, []),
        NavinetUserId:new FormControl(this.model.NavinetUserId, []),
        ClaimVolume:new FormControl('', []),
        ClientName:new FormControl(this.model.ClientName, []),
        ClientNumber:new FormControl(this.model.ClientNumber, []),
        FollowUpDate:new FormControl(this.model.FollowUpDate, [Validators.required]),
        LastRequestedFollowUpDate:new FormControl(this.model.FollowUpDate, []),
        HcpType:new FormControl(this.model.HcpType, []),
        LatePaymentInterest:new FormControl(this.model.LatePaymentInterest, []),
        IsEscalated:new FormControl(this.model.IsEscalated, []),
        SlaDays:new FormControl(this.model.SlaDays, []),
        HcpReceivedDate:new FormControl(this.model.HcpReceivedDate, []),
        ActionItemStatusId:new FormControl(this.model.ActionItemStatusId, []),
        CreatedBy:new FormControl(this.model.CreatedBy, []),
        CreatedDate:new FormControl(this.model.CreatedDate, []),
        ActionItemIntakeSourceId: new FormControl('', [Validators.required]),
        ActionItemEntityId:new FormControl(this.model.ActionItemEntityId, []),
        HcpStartDate:new FormControl(this.model.HcpStartDate, []),
        ProviderId:new FormControl(this.model.ProviderId, []),
        ProviderNonParId:new FormControl(this.model.ProviderNonParId, []),
        LastModified:new FormControl(this.model.LastModified, []),
        LastModifiedBy:new FormControl(this.model.LastModifiedBy, []),
        Requestor:new FormControl(this.model.Requestor, []),
        SentToMatrixPartnerDate:new FormControl(this.model.SentToMatrixPartnerDate, []),
        ValidationTeam:new FormControl(this.model.ValidationTeam, [Validators.required]),
       // MatrixPartnerId:new FormControl('', []),
        AssignedTo:new FormControl(this.model.AssignedTo, []),
        nonPar:new FormControl('', []),
        MedicareEscalationId:new FormControl('', []),
    
     };
      
      return formGroupFields;
  }
  onChangeValue(e: any) {
    let login = this.artCommonService.getLoggedUsr();
    this.teamDrpValue=this.teamId;
    this.submissionDetailForm.patchValue({ValidationTeam:this.teamDrpValue});

    if(this.teamDrpValue ==6){
      this.externalSubmissionService.PayerResolutionTab =true;
    }else{
      this.externalSubmissionService.PayerResolutionTab =false;
    }

    if(this.teamDrpValue ==3){
      this.IntakeSource=this.IntakeSourceCommercial;
    }else if(this.teamDrpValue ==1){
      this.IntakeSource=this.IntakeSourceClaimRR;  
    }else if(this.teamDrpValue ==6){
      this.IntakeSource=this.IntakeSourcePayerSolution;
      setTimeout(() => {
        const ediData = document.getElementById("defaultOpen") as HTMLElement;
        ediData.click();
      }, 200);
    }else if(this.teamDrpValue ==9){
      this.IntakeSource=this.IntakeSourceMedicare;
    }else if(this.teamDrpValue ==4){
      this.IntakeSource=this.IntakeSourceRoster;
    }else if(this.teamDrpValue ==7){
      this.IntakeSource=this.IntakeSourceCommercial;
    }else if(this.teamDrpValue ==1){
      this.IntakeSource=[];
    }else{
      this.IntakeSource=this.IntakeSourcePayerSolution;
    }
    // ClaimVolume validation
    if(this.teamDrpValue !=4 && this.teamDrpValue !=3 && this.teamDrpValue !=9){
      this.addValidation('ClaimVolume');
      this.addValidation('FollowUpDate'); 
    }else{
      this.removeValidation('ClaimVolume'); 
      this.removeValidation('FollowUpDate');
      this.invoiceForm.markAsUntouched();     
    }
    if(this.teamDrpValue ==3){
      this.removeValidation('LastRequestedFollowUpDate'); 
    }
    // ActionItemTypeId validation  
    if(this.teamDrpValue ==4){
      this.addValidation('ActionItemTypeId'); 
      this.removeValidation('FollowUpDate');
    }else{
      this.removeValidation('ActionItemTypeId');
    } 
    
    // Clientnumber & client name validation
    if(this.teamDrpValue == 2){
      this.addValidation('ClientName');
      this.addValidation('ClientNumber');
    }else{
      this.removeValidation('ClientName'); 
      this.removeValidation('ClientNumber');      
    }

    this.getGGusers(this.teamDrpValue);
  }

  getGGusers(teamId){
    let globalGroupName;

    switch (teamId)
    {
        case 1:
            //Claims - R&R
            globalGroupName = "G_ART_RR_USER";
            break;
        case 2:
            //Vendor - National Ancillary Engagement Team
            globalGroupName = "G_ART_VMS_USER";
            break;
        case 3:
            //PS&E (EM/EC/ARM)
            globalGroupName = "G_ART_PSE_USER";
            break;
        case 4:
            //Digital Solutions
            globalGroupName = "G_ART_ESERV_USER";
            break;
        case 5:
            // PRSM Roster Audit
            globalGroupName = "G_ART_PSE_USER";
            break;
        case 6:
            // Payor Solutions
            globalGroupName = "G_ART_PAY_USER";
            break;
        case 7:
            // Cigna + Oscar
            globalGroupName = "G_ART_PSE_USER";
            break;
        case 9:
            // Medicare
            globalGroupName = "G_ART_MA_USER";
            break;
        default:
            break;
    }
    
    this.globalGroupName = globalGroupName;
    this.IntakeSource = this.IntakeSourceData.filter((x: any) => x.GlobalGroupName == this.globalGroupName);

    //  Team dropdown is -> Medicare Provider Relations National Team 
    if(teamId == 9){
      let index = this.IntakeSource.findIndex((val)=> val.Title == 'Medicare');
      if(index != -1){
        this.submissionDetailForm.patchValue({ActionItemIntakeSourceId:this.IntakeSource[index].Id});
      }
    }else{
      this.submissionDetailForm.patchValue({ActionItemIntakeSourceId:''});
    }
    this.IssueTypeDrp = this.IssueTypeDrpData.filter((x: any) => x.GlobalGroupName == this.globalGroupName);
    if(teamId == 4){
      this.IssueTypeDrp = this.IssueTypeDrp.filter((x: any) => x.Id == 8);
      this.submissionDetailForm.patchValue({ActionItemLineOfBusinessId:''});
    }
    
  }

  addValidation(formControls) {
    const textInputControl = this.submissionDetailForm.get(formControls);
    textInputControl.addValidators(Validators.required);
    textInputControl?.updateValueAndValidity();
  }

  removeValidation(formControls) {
    const textInputControl = this.submissionDetailForm.get(formControls);
    textInputControl.setErrors(null);
    textInputControl?.clearValidators();
  }

  onChangeIssues(e: any) {
    let formValue= this.submissionDetailForm.get('ActionItemIssueTypeId').value;
    let selectedIssueTypeId = formValue;
    let selectedTeamId = this.teamId; // Fetch selected Team
    if (selectedTeamId && selectedIssueTypeId && this.globalGroupName) {
      // Load Issue Reason options only if both Team and Issue Type are selected
      this.IssueReasonDrp = this.IssueReasonData.filter((x: any) => x.ParentId == selectedIssueTypeId && x.GlobalGroupName == this.globalGroupName);
      if(this.IssueReasonDrp.length > 0){
        this.IssueReasonDrp.sort((a, b) => a.Title.localeCompare(b.Title));
      }
      // Reset Issue Reason selection when Issue Type changes
      this.submissionDetailForm.get('ActionItemIssueReasonId').setValue('');
    } else {
      // Clear Issue Reason dropdown if Team or Issue Type is missing
      this.IssueReasonDrp = [];
      this.submissionDetailForm.get('ActionItemIssueReasonId').setValue('');
    }

    if((this.teamDrpValue == 3 && this.submissionDetailForm.get('ActionItemIssueTypeId').value == 2)){
      this.submissionDetailForm.patchValue({LatePaymentInterest: 0});
    }
  }

  onChangeEscalated(ev: any){
    if(ev.target.checked){
      this.addValidation('SlaDays');
    }else{
      this.removeValidation('SlaDays');
    }
  }

  trackByFn(index, item) {
    return item.Id; // Replace 'id' with your unique identifier
  }
  
  compareObjects(o1: any, o2: any): boolean {
    return o1 && o2 ? o1.id === o2.id : o1 === o2;
  }
  
  createSubmit(attachmentFlag: boolean){
    console.log(this.submissionDetailForm, this.invoiceForm,this.CommentsTxt?.length);
    this.CommentsTxt = this.CommentsTxt?.length == undefined ? []: this.CommentsTxt;
    let login = this.artCommonService.getLoggedUsr();
      this.model.CreatedBy= login.login.toUpperCase();
      let saveData:any
     saveData={
       "isCloned": this.isCloned ? true : false,
       "ParentActionItemid": this.actionItemId != null ? +this.actionItemId : null,
       "ActionItemComment": {
        "Comments": this.CommentsTxt,
        "LastModifiedBy": login.login.toUpperCase(),
        "ActionItemCommentId": null, 
      },
       "ActionItemMedicare": {
        "LastModifiedBy": login.login.toUpperCase(),
        "SubmittedtoClaims": false,
        "BatchedForProcessing": false,
        "ActionItemMedicareId": null,
      },
       "ActionItemPayer": {
        "ActionItemPayerId": 6,
         "CorrectPricing": this.CheckValuetoBoolean(this.externalSubmissionService.ActionItemPayer.CorrectPricing),
         "MedicarePrimary": this.CheckValuetoBoolean(this.externalSubmissionService.ActionItemPayer.MedicarePrimary),
         "COBInvolded": this.CheckValuetoBoolean(this.externalSubmissionService.ActionItemPayer.COBInvolded),
         "PayerContactMadeId": this.externalSubmissionService.ActionItemPayer.PayerContactMadeId == '' ? null : Number(this.externalSubmissionService.ActionItemPayer.PayerContactMadeId),
         "PayerContactName": this.externalSubmissionService.ActionItemPayer.PayerContactName,
         "ProvComment": this.externalSubmissionService.ActionItemPayer.ProvComment,
         "ReqComment": this.externalSubmissionService.ActionItemPayer.ReqComment,
         "PayerRequesterTeamId": this.externalSubmissionService.ActionItemPayer.PayerRequesterTeamId  == '' ? null : Number(this.externalSubmissionService.ActionItemPayer.PayerRequesterTeamId),
         "VendorTIN": null,
         "ClaimInfo": this.CheckValuetoBoolean(this.externalSubmissionService.ActionItemPayer.ClaimInfo) ,
         "EOBAttached": this.CheckValuetoBoolean(this.externalSubmissionService.ActionItemPayer.EOBAttached),
         "SubmittedtoClaims": false,
         "LastModifiedBy": login.login.toUpperCase(),
       },
       "ActionItemExternal": {
        "ExternalSubmissionIntakeSourceId": this.submissionDetailForm.get('ActionItemIntakeSourceId').value,
        "ExternalSubmissionTeamId":  this.teamId,
        "ExternalRosterTypeId": null,
        "LastModifiedBy": login.login.toUpperCase(),
        'ExternalSubmissionIntakeSourceOther':this.ExternalSubmissionIntakeSourceOther
      },
       "ActionItem": {},
       "ActionItemContact":[]
     }
    
    //  if(this.teamDrpValue ==6){
    //  saveData.ActionItemPayer= this.externalSubmissionService.ActionItemPayer;
    //  }

     this.submissionDetailForm.value.FollowUpDate = this.dateCovert(this.submissionDetailForm.value.FollowUpDate)
     this.submissionDetailForm.value.LastRequestedFollowUpDate = this.dateCovert(this.submissionDetailForm.value.LastRequestedFollowUpDate)
     this.submissionDetailForm.value.CignaReceivedDate = this.dateCovert(this.submissionDetailForm.value.CignaReceivedDate)

     saveData.ActionItem =this.submissionDetailForm.value;
     if(this.teamDrpValue =='3' || this.teamDrpValue =='9' || this.teamDrpValue =='4' || this.teamDrpValue =='5'){
       saveData.ActionItemContact=this.contactTypeData(this.tableArr);
      }
      if(this.teamDrpValue !='4'){
        saveData.ActionItem.ActionItemTypeId = 2;
      }
      if(!this.externalSubmissionService.nonPar){
        saveData.ActionItem['ProviderId'] = +this.externalSubmissionService.providerId;
        saveData.ActionItem['ProviderNonParId'] = null;
      }else{
        saveData.ActionItem['ProviderId'] = null;
        saveData.ActionItem['ProviderNonParId'] = +this.externalSubmissionService.nonPar;
      }
      saveData.ActionItem['ExternalNotifyOnClose'] = Boolean(saveData.ActionItem['ExternalNotifyOnClose']);
      //saveData.ActionItem['MatrixPartnerId']=  saveData.ActionItem.MatrixPartnerId == '' ? null : saveData.ActionItem.MatrixPartnerId;
      saveData.ActionItem['ClaimVolume']=  saveData.ActionItem.ClaimVolume == '' ? 2 : saveData.ActionItem.ClaimVolume;
      saveData.ActionItem['ClientNumber']=  saveData.ActionItem.ClientNumber != null ? saveData?.ActionItem?.ClientNumber.toString() : null;
    
      if ((this.submissionDetailForm.valid && this.teamDrpValue !=6 && !this.invoiceForm.valid && this.teamDrpValue !=3 && this.teamDrpValue !=9 && this.teamDrpValue !=4 && this.teamDrpValue !=5) || 
      (this.teamDrpValue ==6 && this.externalSubmissionService.payerValidationFailed == false && this.submissionDetailForm.valid && this.externalSubmissionService.ActionItemPayer.CorrectPricing !=0 && this.externalSubmissionService.ActionItemPayer.CorrectPricing !=null && this.externalSubmissionService.ActionItemPayer.MedicarePrimary !=0 && this.externalSubmissionService.ActionItemPayer.MedicarePrimary !=null && this.externalSubmissionService.ActionItemPayer.COBInvolded !=0 && this.externalSubmissionService.ActionItemPayer.COBInvolded !=null) ||
      ((this.teamDrpValue ==3 || this.teamDrpValue ==9 || this.teamDrpValue ==4 || this.teamDrpValue ==5) && this.invoiceForm.valid && this.submissionDetailForm.valid)
     ) {
      this.externalSubmissionService.showAttachmentTab = false;
      console.log(saveData)
      // Your submission logic here
      this.externalSubmissionService.getExternalSubComplete(saveData).subscribe((res: any) => {
        if (res && res.result && res.result[0].ufn_create_external_submission_actionitem != -1) {
          this.showDialog = false;
          if(!attachmentFlag){
            this.showDialog = false;
            this._router.navigate(['/ExternalSubmission/Main'], { queryParamsHandling: 'merge' }).then(() => { window.location.reload(); })
          }
          this.showAttachmentTab = true;
          this.externalSubmissionService.showAttachmentTab = this.showAttachmentTab;
          this.externalSubmissionService.actionItemId =res.result[0].ufn_create_external_submission_actionitem;
          const ediData = document.getElementById("defaultOpen") as HTMLElement;
          ediData.setAttribute('disabled','true');
          if(this.teamDrpValue ==6){
            const PayerSolutionTab = document.getElementById("PayerSolutions") as HTMLElement;
            PayerSolutionTab.setAttribute('disabled','true');
          }
          if(this.isExternalSubmissionCreatePg){
            this.externalSubmissionService.readOnly = false;
          }else{
            this.externalSubmissionService.readOnly = true;
          }
          setTimeout(() => {
            let attachmentTab = document.getElementById("Attachment") as HTMLElement;
            attachmentTab.click();
            window.scrollTo({
              top: 0,
              behavior: 'smooth' // Optional: adds smooth scrolling animation
            });
          }, 200);
        }else{
          this.showAttachmentTab = false;
          this.externalSubmissionService.showAttachmentTab = this.showAttachmentTab;
          const ediData = document.getElementById("defaultOpen") as HTMLElement;
          ediData.removeAttribute('disabled');
          if(this.teamDrpValue ==6){
            const PayerSolutionTab = document.getElementById("PayerSolutions") as HTMLElement;
            PayerSolutionTab.removeAttribute('disabled');
          }
        }
      });
    } else {
      this.markFormGroupTouched(this.submissionDetailForm);
      this.markFormGroupTouched(this.invoiceForm);
      if(this.submissionDetailForm.valid && this.teamDrpValue ==6){
        this.externalSubmissionService.payerValidationFailed = true;
      }else{
        this.externalSubmissionService.payerValidationFailed = false;
      }
    }
    
  }
  contactTypeData(data:any){
    let originArr=[];
    let login = this.artCommonService.getLoggedUsr();
    if(data !='' && data.length >0){
      for (let i = 0; i < data.length; i++) {
        let obj={
          Id:null,
          ContactName:data[i].ContactName,
          ContactPhone:data[i].ContactPhone,
          ContactEmail:data[i].ContactEmail,
          Extension:data[i].Extension,
          ActionItemContactTypeId:data[i].ActionItemContactTypeId != "Default" ? data[i].ActionItemContactTypeId : 2,
          LastModifiedBy:login.login.toUpperCase(),
        }
        console.log(originArr)
        originArr.push(obj);    
      }
    }
  return originArr;
}
  
  dateCovert(date:any){
    if(date !='' && date !=null){
      let currentDate =moment(date).format('YYYY-MM-DD');
      currentDate =currentDate +' '+'00:00:00';
      return currentDate
    }else{
      let currentDate =moment().format('YYYY-MM-DD');
      currentDate =currentDate +' '+'00:00:00';
      return currentDate;
    }
  }
  markFormGroupTouched(formGroup: FormGroup) {
    (<any>Object).values(formGroup.controls).forEach(control => {
      control.markAsTouched();
  
      if (control.controls) {
        this.markFormGroupTouched(control);
      }
    });
  }
  openChildComponent(){
    this.displayRootCause = true;
   
   }
   get formArr() {
    return this.invoiceForm.get("Rows") as FormArray;
  }

  initRows() {
    return this._fb.group({
      // name: ["", this.isValidationFlag ? Validators.required : null],
      // phone: ["", this.isValidationFlag ? Validators.required : null],
      // ext: ["", this.isValidationFlag ? Validators.required : null],
      // email: ["", this.isValidationFlag ? Validators.required : null],
      // Type: ["", this.isValidationFlag ? Validators.required : null]
        Id: [null, []],
        ContactName: ["", [Validators.required]],
        ContactPhone: ["", [Validators.required,Validators.pattern(/^\(\d{3}\)\s\d{3}-\d{4}$/)]],       
        Extension: ["",[Validators.pattern(/^\d{1,10}$/)]], 
        ContactEmail: ["", [Validators.required,Validators.email]],
        ActionItemContactTypeId: ['1'],

    });
  }

  addNewRow() {
    this.invoiceForm.markAsUntouched(); 
    this.formArr.push(this.initRows());
    this.tableArr.push({ isEdit: true });
  }

  deleteRow(index: number) {
    this.formArr.removeAt(index);
    this.tableArr.splice(index, 1);
    if(this.tableArr.length == 0){
      this.addNewRow();
      this.invoiceForm.markAsUntouched();
    }
  }
  
  onSave(index: number) {
    if (this.formArr.valid) {
    let formData=this.formArr.value[index];
     let drpName = this.ContactTypeDrp.find((x:any)=>x.Id==formData.ActionItemContactTypeId)
      this.tableArr.splice(index, 1, {
        ...this.formArr.value[index],
        isEdit: false, isPercentage: this.isPercentage,contactTypeName:drpName?.Title ? drpName?.Title:''
      });
    }else{
      this.markFormGroupTouched(this.invoiceForm);
    }
  }

  onEdit(index: number) {
    this.invoiceForm.controls["Rows"]["controls"][index].controls.ContactName.setValidators(
      this.isValidationFlag ? Validators.required : null
    );
    this.tableArr[index].isEdit = true;
  }

  onCheckboxChange(e) {
    this.isValidationFlag = e.target.checked;
    this.invoiceForm.reset();
    this.tableArr = [];
    const control = <FormArray>this.invoiceForm.controls["Rows"];
    for (let i = control.length - 1; i >= 0; i--) {
      control.removeAt(i);
    }
  }
  formatPhoneNumber(event: any, index: number) {
    let input = event.target.value.replace(/\D/g, ""); // Remove all non-numeric characters
    if (input.length > 10) {
        input = input.substring(0, 10); // Restrict to 10 digits
    }
    // Apply formatting (xxx) xxx-xxxx
    let formattedNumber = "";
    if (input.length > 0) {
        formattedNumber = `(${input.substring(0, 3)}`;
    }
    if (input.length >= 4) {
        formattedNumber += `) ${input.substring(3, 6)}`;
    }
    if (input.length >= 7) {
        formattedNumber += `-${input.substring(6, 10)}`;
    }
    // Update the form control value
    this.formArr.controls[index].patchValue({ ContactPhone: formattedNumber }, { emitEvent: true });
}

validateExt(event: any, index: number) {
  let input = event.target.value.replace(/\D/g, ""); // Remove non-numeric characters
  if (input.length > 10) {
      input = input.substring(0, 10); // Restrict to 10 digits
  }
  // Update the form field value
  this.formArr.controls[index].get('Extension').setValue(input);
}

restrictExtInput(event: KeyboardEvent) {
  const charCode = event.which ? event.which : event.keyCode;
  if (charCode < 48 || charCode > 57) {
      event.preventDefault(); // Block non-numeric characters
  }
}

confirm() {
  this.showDialog = true;
}

onHideDialog(){
  this.showDialog = false;
}

OnFocusCalender(ev: any){
  // alert(1);
  this.CignaRecvyesterday =moment().format('MM/DD/YYYY')  + ' '+'00:00:00';
  this.submissionDetailForm.patchValue({CignaReceivedDate: this.CignaRecvyesterday});
}

OnFocusFollowupCalender(ev: any){
  this.FollowUpDateYes =moment().format('MM/DD/YYYY')  + ' '+'00:00:00';
  this.submissionDetailForm.patchValue({FollowUpDate:this.FollowUpDateYes});
}

OnFocusLsMdFollowupCalender(ev: any){
  this.LastRequestedFollowUpDateYes =moment().format('MM/DD/YYYY')  + ' '+'00:00:00';
  this.submissionDetailForm.patchValue({LastRequestedFollowUpDate:this.LastRequestedFollowUpDateYes});
}


  CheckValuetoBoolean(data) {
    let flagD: any;
    if (data != '' && data != null) {
      flagD = data == "1" ? true : false;
    } else {
      flagD = false;
    }
    return flagD
  }

  fetchMainPageData() {
    const payload = { actionItemId: this.actionItemId };
    this.externalSubmissionService.getMainDetails(payload).subscribe((data: any) => {
      if (data?.result?.length) {
        this.clonedData = data.result[0].ufn_get_external_submission_main_details[0];
        this.externalSubmissionService.mainPageData =  this.clonedData;
        this.setClonedValuesForFormData();
      }
    });
  }

  setInitialValues(initialData: any) {
    this.invoiceForm = this._fb.group({
      Rows: this._fb.array([])
    });
    this.tableArr = [];
    initialData.forEach((itemData,index) => {
      let type = this.findDrpDownValueByName(this.ContactTypeDrp, itemData?.Type);
      const itemFormGroup = this.initRows();
      itemFormGroup.patchValue({
        ContactName: itemData?.Name,
        ContactPhone: itemData?.Phone,
        Extension: itemData?.Extension,
        ContactEmail: itemData?.Email,
        ActionItemContactTypeId: type?.Id ?? 1
      }); // Use patchValue to set individual values
      this.formArr.push(itemFormGroup);
      this.tableArr.push({
        ...this.formArr.value[index],
        isEdit: false, isPercentage: this.isPercentage,
        contactTypeName:type?.Title ? type.Title:''
      });
    });
  }

  convertIntoUTC(date) {
    let estDate = DateTime.fromFormat(date,'yyyy-MM-dd',{zone: 'America/New_York'}).set({hour:0,minute:0,second:0});
    let formattedEstDate = estDate.toFormat('yyyy-MM-dd HH:mm:ss ZZ');
    let utcDatetime = this._sharedService.getUTCDate(new Date(formattedEstDate));
    return utcDatetime;
  }
  
  onPaste(event: ClipboardEvent) {
	  let notesValue=0;
    if(this.CommentsTxt && this.CommentsTxt.length >0){
        notesValue=this.CommentsTxt.length;
    }   
    let count = event.clipboardData.getData('text');
    count= count.replace(/\r\n|\r|\n/g, "\n");
    let count1 =count.length;
	  count1 =count1+notesValue;	
      if (count1 > 4000) {
        this.messageService.add({
          severity: 'info', summary: 'Clipboard Text',
          detail: 'Pasted text has been reduced to 4000 characters'
        });
      }
  
    }


}

import { AfterViewInit, Directive } from '@angular/core';
import { Calendar } from 'primeng/calendar';
import Inputmask from 'inputmask';

@Directive({
  selector: '[InputDateMask]'
})
export class DateMaskDirective implements AfterViewInit {
  constructor(private primeCalendar: Calendar) { }

  ngAfterViewInit() {
    new Inputmask( this.getDateMask() ).mask( this.getHTMLInput() );
  }

  getHTMLInput(): HTMLInputElement {
    return this.primeCalendar.el.nativeElement.querySelector('input');
  }

  getDateMask(): string {
    if(this.primeCalendar.timeOnly) {
      return '99:99';
    } else if(this.primeCalendar.showTime) {
      return '99/99/9999 99:99';
    } else {
      return '99/99/9999';
    }
  }
}
