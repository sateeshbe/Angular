import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ArtCommonService } from 'src/app/art-common/art-common.service';
import { SupportRequestService } from '../support-request.service';
import { UsersList } from 'src/app/action-items/art-interface/common';
import { AdminUserService } from 'src/app/admin-user/admin-user.service';
import { combineLatest, forkJoin, Subject, switchMap, takeUntil, tap } from 'rxjs'
import { DatePipe } from '@angular/common';
import { SupportRequestGovernance_Backdate_Page, SupportRequestGovernanceType, SupportRequestResult, SupportRequestType, SupportType, SupportRequestGovernanceTypeDisplay, SupportRequestGovernanceBackdateActionItemField, SupportRequestGovernanceBackdateActionItemFieldDisplay } from '../models/support-request-enum';
import { GENERIC_CONSTANT } from 'src/app/generic-workflow/models/constants';
import { ART_CONSTANTS } from 'src/app/models/constant';
import { HttpEventType, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';
import { MessageService } from 'primeng/api';
import { GenericWorkflowService } from 'src/app/generic-workflow/generic-workflow.service';
import { ActivatedRoute } from '@angular/router';
import { ArtFileUploadService } from 'src/app/action-items/art-RR-common/art-file-upload/art-file-upload.service';
import { ART_CONSTANTS_RR } from 'src/app/action-items/models/constant';

@Component({
  selector: 'app-support-request-view-edit',
  templateUrl: './support-request-view-edit.component.html',
  styleUrls: ['./support-request-view-edit.component.scss']
})
export class SupportRequestViewEditComponent implements OnDestroy {
  private destroy$ = new Subject<void>;
  supportGovernanceDetailsForm!: FormGroup;
  supportGovernanceDetails: any;
  supportRequestResponseDetails: any;
  pageTitle: string = "";
  isEditable: boolean = false;
  startTime: any;
  loggedinUser: string = "";
  userListRes: UsersList[];
  userListNoMatch: boolean;
  disableSubmitButton = true;
  duplicateUserName: boolean;
  categoryDropDownOptions: any;
  impactDropDownOptions: any;
  priorityDropDownOptions: any;
  statusDropDownOptions: any;
  responseCategoryDropDownOptions: any;
  supportType: number = SupportType.SupportFeedback;
  supportRequestGovernanceType: number = SupportRequestGovernanceType.Backdate;
  supportRequestGovernance_Backdate_Page: number = SupportRequestGovernance_Backdate_Page.ActionItem;
  supportRequestResult: number = SupportRequestResult.Approve;
  SupportTypeEnum = SupportType;
  SupportRequestGovernanceTypeEnum = SupportRequestGovernanceType;
  SupportRequestResultEnum = SupportRequestResult;
  SupportRequestGovernance_Backdate_PageEnum = SupportRequestGovernance_Backdate_Page;
  backdate_PageType: number = SupportRequestGovernance_Backdate_Page.ActionItem;
  selectedCategoryTitle: string = "";
  selectedImpactTitle: string = "";
  selectedPriorityTitle: string = "";
  selectedStatusTitle: string = "";
  selectedResponseCategoryTitle: string = "";
  disableNotifyManager: boolean = false;
  releaseDateInMMDDYYY: string = "";
  requestedDateInCustomFormat: string = "";
  backdate_NewDateInCustomFormat: string = "";
  backdate_PageTitle: string = "";
  backdate_Outreach_Field: string = "";
  backdate_ActionItem_Field: string = "";
  isAdmin: boolean = false;
  file: any;
  uploadSub: Subscription;
  uploadProgress: number;
  disableDenyButtonForSupportFeedback: boolean = true;
  disableApproveButtonForSupportFeedback: boolean = true;
  disableDenyButtonForGovernance: boolean = true;
  disableApproveButtonForGovernance: boolean = true;
  existingUserAssignedTo: string = "";
  newUserAssignedTo: string = "";
  sizeLimit: number = environment.fileSizeLimit;
  supportRequestId: number = 0;
  hasAttachments: boolean = false;
  assignedToValue: UsersList;

  constructor(
    private _sharedServices: ArtCommonService,
    private _supportRequestService: SupportRequestService,
    private _adminService: AdminUserService,
    private _fb: FormBuilder,
    private _datePipe: DatePipe,
    private _messageService: MessageService,
    private _artFileUploadService: ArtFileUploadService,
    private _route: ActivatedRoute
  ) { }

  ngOnDestroy() {
    this.destroy$.next();  // Emit value to signal unsubscription
    this.destroy$.complete(); // Complete the Subject to avoid memory leaks
  }

  async ngOnInit(): Promise<void> {
    // Initialize variables
    this.startTime = this._sharedServices.getCurrentUTCDateWithTime();
    this.selectedCategoryId = null;
    this.selectedImpactId = null;
    this.selectedPriorityId = null;
    this.selectedStatusId = null;
    this.selectedResponseCategoryId = null;
    this.newUserAssignedTo = "";
    // Initialize form with FormBuilder
    this.supportGovernanceDetailsForm = this._fb.group({
      assignToFormControl: [''],
      categorySelect: [null],
      impactSelect: [null],
      prioritySelect: [null],
      responseCategorySelect: [null],
      statusSelect: [null],
      responseComments: [null],
      governanceComments: [null],
    });
    try {
      // Await logged-in user asynchronously
      const loggedinUser = await this._sharedServices.getLoggedUsr().login; // Assume this returns a Promise<number>
      this.loggedinUser = loggedinUser;
      const id = this._route.snapshot.paramMap.get('id');
      this.supportRequestId = id ? +id : 0; // Default to 0 if id is null
      // Fetch other data using forkJoin
      forkJoin({
        categoryOptions: this._adminService.getDataByTableName({
          tablename: "SupportRequestResponseCatagory"
        }),
        impactOptions: this._adminService.getDataByTableName({
          tablename: "SupportRequestResponseImpact"
        }),
        priorityOptions: this._adminService.getDataByTableName({
          tablename: "SupportRequestResponsePriority"
        }),
        statusOptions: this._adminService.getDataByTableName({
          tablename: "SupportRequestResponseStatus"
        }),
        responseCategoryOptions: this._adminService.getDataByTableName({
          tablename: "SupportRequestResponseSubCategory"
        }),
        details: this._supportRequestService.getSupportGovernanceDetails({
          id: this.supportRequestId, // remove Replace hardcoded ID with dynamic input if possible
          userid: this.loggedinUser // Use the user ID here
        }),
        requestResponse: this._supportRequestService.getSupportRequestResponse({
          id: this.supportRequestId, // remove Replace hardcoded ID with dynamic input if possible
          userid: this.loggedinUser // Use the user ID here
        })
      }).pipe(
        takeUntil(this.destroy$),
        tap(({ categoryOptions, impactOptions, priorityOptions, statusOptions, responseCategoryOptions, details, requestResponse }) => {
          // Assign dropdown options
          this.categoryDropDownOptions = categoryOptions.result;
          this.impactDropDownOptions = impactOptions.result;
          this.priorityDropDownOptions = priorityOptions.result;
          this.statusDropDownOptions = statusOptions.result;
          this.responseCategoryDropDownOptions = responseCategoryOptions.result;
          console.log(`Support Governance Details API response:`, details);

          // Handle details response
          if (details?.result?.SupportRequestGovernanceDetails?.length > 0) {
            this.supportGovernanceDetails = details.result.SupportRequestGovernanceDetails[0];
            console.log(`Support Governance Details API response:`, this.supportGovernanceDetails);
            this.supportType = this.supportGovernanceDetails?.SupportType;
            this.backdate_PageType = this.supportGovernanceDetails?.Backdate_Page;
            this.supportRequestGovernanceType = this.supportGovernanceDetails?.SupportGovernanceType;
            if (this.supportGovernanceDetails?.Backdate_Outreach_Field === 1) {
              this.supportRequestGovernance_Backdate_Page = SupportRequestGovernance_Backdate_Page.OutREACH
            } else if (this.supportGovernanceDetails?.Backdate_ActionItem_Field === 1) {
              this.supportRequestGovernance_Backdate_Page = SupportRequestGovernance_Backdate_Page.ActionItem;
            } else {
              this.supportRequestGovernance_Backdate_Page = -1; // unknown
            }

            if (this.supportGovernanceDetails?.Backdate_Page === 1) {
              this.backdate_PageTitle = "ActionItem";
            } else if (this.supportGovernanceDetails?.Backdate_ActionItem_Field === 1) {
              this.backdate_PageTitle = "OutREACH";
            } else {
              this.backdate_PageTitle = "Unknown"; // unknown
            }
            this.supportRequestResult = this.supportGovernanceDetails?.SupportRequestResultId;
            this.setPageTitle();
            this.setIsEditableFlag(this.supportGovernanceDetails);
            this.setDropdowns();
            this.isAdmin = this.isUserAnAdmin();
            this.hasAttachments = this.supportGovernanceDetails?.AttachmentDetails && this.supportGovernanceDetails?.AttachmentDetails.length > 0;
            if (this.supportGovernanceDetails.AssignedTo != '' && this.supportGovernanceDetails.AssignedTo != null) {
              this.updateAsssigntoValue(this.supportGovernanceDetails.AssignedTo);
            }
          }
          if (requestResponse?.result?.SupportRequestResponseDetails?.length > 0) {
            this.supportRequestResponseDetails = requestResponse.result.SupportRequestResponseDetails[0];
            console.log(`Support Request Response Details API response:`, this.supportRequestResponseDetails);
            this.setPageTitle();
            this.setDropdowns();
            this.isAdmin = this.isUserAnAdmin();
            this.updateDropDownTitles(this.supportRequestResponseDetails);
          }
        })
      ).subscribe({
        error: (err) => console.error("Error fetching data:", err)
      });

    } catch (error) {
      console.error("Error fetching user ID:", error);
    }
    this._supportRequestService.startActionItemActivityLog();
    this._sharedServices.startCommonActivityLog(undefined, this.supportRequestId, ART_CONSTANTS_RR.SUPPORT_FEEDBACK_LOG.DETAILS.CNTRL,
      ART_CONSTANTS_RR.SUPPORT_FEEDBACK_LOG.DETAILS.ACT, "", "");
    this._sharedServices.startSaveErrorLog("SupportFeedbackEdit", "Support-request");
  }
  // Define

  setPageTitle(): void {
    if (this.supportGovernanceDetails?.SupportType == SupportType.SupportFeedback) {
      this.pageTitle = "Support/Feedback request";
    } else if (this.supportGovernanceDetails?.SupportType == SupportType.Governance) {
      let supportGovernanceTypeType: SupportRequestGovernanceType = this.supportGovernanceDetails?.SupportGovernanceType;
      this.pageTitle = `${SupportRequestGovernanceTypeDisplay[supportGovernanceTypeType]} request`;
    } else {
      this.pageTitle = `Unknown Support type: ${this.supportGovernanceDetails?.SupportType}`;
    }
  }


  setIsEditableFlag(supportGovernanceDetails: any): void {
    const userIsAdminFlag = supportGovernanceDetails?.UserIsAdmin === true;
    this.isEditable =
      (supportGovernanceDetails?.SupportRequestResultId === SupportRequestResult.NoResponse &&
        (
          userIsAdminFlag ||
          (!!supportGovernanceDetails?.AssignedTo &&
            supportGovernanceDetails?.AssignedTo?.toLowerCase() === this.loggedinUser.toLowerCase())
        )
      ) ||
      (supportGovernanceDetails?.SupportRequestResultId === SupportRequestResult.PendingAdmin && userIsAdminFlag) ||
      (supportGovernanceDetails?.SupportRequestTypeId === SupportRequestType.Training);
  }

  checkUser() {
    this.newUserAssignedTo = this.supportGovernanceDetailsForm.get("assignToFormControl").value?.userid;
  }

  onSelect(event: any) {
    this.newUserAssignedTo = this.supportGovernanceDetailsForm.get("assignToFormControl").value?.userid;
  }
  onClear(event: any) {
    this.newUserAssignedTo = this.supportGovernanceDetailsForm.get("assignToFormControl").value?.userid;
  }
  updateAsssigntoValue(data: any) {
    let userSearchList = {
      "P_UserName": data
    }
    this._supportRequestService.getSearchList(userSearchList).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
      console.log(response);
      let userlist = [];
      if (response.result && response.result.length != 0) {
        userlist = response.result;
      } else {
        let obj = {
          fax: "",
          firstname: "",
          lastname: "",
          phone: "",
          phoneextension: "",
          useremail: "",
          userid: "",
          username: data
        }
        userlist.push(obj);
      }
      this.userListNoMatch = (userlist.length == 0) ? true : false;
      userlist = this._sharedServices.userNameAddLANID(userlist);
      this.userListRes = userlist;
      let updateDate = this.userListRes.filter((x: any) => x.username == data);
      console.log(updateDate, "assignto");
      this.assignedToValue = updateDate[0];
    });

  }
  searchUserList(event: any) {
    this.userListNoMatch = false;
    this.duplicateUserName = false;
    if (event.query.length > 1) {
      let userSpecialChaReplace = event.query;
      userSpecialChaReplace = userSpecialChaReplace.replace(/\\/g, '\\\\')
      let userSearchList = {
        "P_UserName": userSpecialChaReplace
      }
      this._supportRequestService.getSearchList(userSearchList).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
        console.log(response);
        let userlist = response.result;
        this.userListNoMatch = (userlist.length == 0) ? true : false;
        userlist = this._sharedServices.userNameAddLANID(userlist);
        this.userListRes = userlist;
      });
    }
  }

  setDropdowns() {
    this.supportGovernanceDetailsForm.patchValue({ categorySelect: this.supportRequestResponseDetails?.SupportRequestResponseCatagoryId ?? null });
    this.supportGovernanceDetailsForm.patchValue({ impactSelect: this.supportRequestResponseDetails?.SupportRequestResponseImpactId ?? null });
    this.supportGovernanceDetailsForm.patchValue({ prioritySelect: this.supportRequestResponseDetails?.SupportRequestResponsePriorityId ?? null });
    this.supportGovernanceDetailsForm.patchValue({ responseCategorySelect: this.supportRequestResponseDetails?.SupportRequestResponseSubCategoryId ?? null });
    this.supportGovernanceDetailsForm.patchValue({ statusSelect: this.supportRequestResponseDetails?.SupportRequestResponseStatusId ?? null });
    // this.supportGovernanceDetailsForm.patchValue({ notifyManager: this.supportGovernanceDetails?.ManagerNotify });
    // this.supportGovernanceDetailsForm.patchValue({ routeToWorkforce: this.supportGovernanceDetails?.RouteToWorkforce });
    this.supportGovernanceDetailsForm.patchValue({ responseComments: this.supportRequestResponseDetails?.Comments });
    // this.releaseDateInMMDDYYY = this._datePipe.transform(this.supportGovernanceDetails?.ReleaseDate, 'MM/dd/yyyy') || '';
    // this.supportGovernanceDetailsForm.patchValue({ releaseDate: this._datePipe.transform(this.supportGovernanceDetails?.ReleaseDate, 'yyyy-MM-dd') || '' });
    // this.supportGovernanceDetailsForm.patchValue({ releaseVersion: this.supportGovernanceDetails?.ReleaseVersion });
    // this.supportGovernanceDetailsForm.patchValue({ releaseComments: this.supportGovernanceDetails?.ReleaseComments });
    this.supportGovernanceDetailsForm.patchValue({ governanceComments: this.supportRequestResponseDetails?.Comments });


    // this.supportGovernanceDetailsForm.patchValue({ backdate_Comments: this.supportGovernanceDetails?.Backdate_Comments });

    this.requestedDateInCustomFormat = this.UTCToEasternTime(this.supportGovernanceDetails?.RequestedDate);
    this.backdate_NewDateInCustomFormat = this.UTCToEasternTime(this.supportGovernanceDetails?.Backdate_NewDate);
  }
  updateDropDownTitles(supportRequestResponseDetails: any): void {
    this.selectedCategoryTitle = supportRequestResponseDetails?.SupportRequestResponseCatagory;
    this.selectedImpactTitle = supportRequestResponseDetails?.SupportRequestResponseImpact;
    this.selectedPriorityTitle = supportRequestResponseDetails?.SupportRequestResponsePriority;
    this.selectedResponseCategoryTitle = supportRequestResponseDetails?.SupportRequestResponseSubCategory;
    this.selectedStatusTitle = supportRequestResponseDetails?.SupportRequestResponseStatus;
  }

  isUserAnAdmin(): boolean {
    let result: boolean = this.supportGovernanceDetails?.UserIsAdmin === true;
    return result;
  }




  onFileChange(event: any) {
    let correctformat = this.checkFilePreRequiste(event.target.files[0]);
    if (correctformat === true) {
      this.uploadS3();

    }
  }

  /**
   * Convert Files list to normal array list
   * @param files (Files List)
   */
  // prepareFilesList(file: any) {

  //   file.progress = 0;
  //     let typefile = file.name;
  //     let correctformat = this.checkFilePreRequiste(file);
  //     let fileName = typefile.split(".");
  //     if (fileName[1] && correctformat) {
  //       file.typefiles = fileName[1].toUpperCase();
  //     }

  //   this.uploadS3(file);
  //   // this.uploadFilesSimulator(0);
  // }

  checkFilePreRequiste(tmpFile: File) {
    //var result:boolean = false;
    this.file = tmpFile;
    let extension = tmpFile.name.lastIndexOf('.');
    let fileExtension = tmpFile.name.substring(extension + 1, tmpFile.name.length);
    fileExtension = fileExtension.toLowerCase();
    let fileSize = tmpFile.size / (1024 ** 2);
    let correctFormat = true;
    if (ART_CONSTANTS.ALLOWED_FILE_TY.includes(fileExtension) &&
      fileSize <= environment.fileSizeLimitRnR) {
      correctFormat = true;
    } else if (!ART_CONSTANTS.ALLOWED_FILE_TY.includes(fileExtension)) {
      let errormsg = "Please select a file with the allowed extensions";
      this.onFileErrorFormat(errormsg);
      correctFormat = false;
    } else if (fileSize > environment.fileSizeLimitRnR) {
      let fileSize = this.formatBytes(tmpFile.size);
      let common = tmpFile.name + " (" + fileSize + ") ";
      let errormsg = "File " + common + `exceeds maximum allowed upload size of ${environment.fileSizeLimitRnR} MB`
      this.onFileErrorFormat(errormsg);
      correctFormat = false;
    }
    return correctFormat;
  }

  onFileErrorFormat(errorMsg: any) {
    this._messageService.add({ severity: 'error', summary: 'Failure', detail: errorMsg });
  }

  /**
   * format bytes
   * @param bytes (File size in bytes)
   * @param decimals (Decimals point)
   */
  formatBytes(bytes: any) {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    //const dm = decimals <= 0 ? 0 : decimals || 2;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  uploadS3() {
    if (this.file) {
      //preparing the file name with userid , event id & timestamp
      let extension = this.file.name.lastIndexOf('.');
      let fileNameWOE = this.file.name.substring(0, extension);
      let fileExtension = this.file.name.substring(extension, this.file.name.length);
      let documnetName = fileNameWOE + '_' + this._sharedServices.getLoggedUsr().lanID +
        '_' + this._datePipe.transform(Date.now(), ART_CONSTANTS.FILE_NM_DT_FORM) + fileExtension;
      let filename = "SupportRequests/" + this.supportRequestId + "/" + documnetName;
      // this.fileRenamed = filename;
      let filenameWithExt = documnetName;
      //API call to get the presigned URL
      this._supportRequestService.getPreSignedUrl(filename).pipe(takeUntil(this.destroy$)).subscribe((response) => {
        let preSignedUrl = response[ART_CONSTANTS.API_RES.RESULT].presignedURL;
        if (preSignedUrl != null && preSignedUrl != undefined) {
          //uploading the file with presigned URL into S3 Bucket
          this.uploadFile(this.file, preSignedUrl, filenameWithExt);
          //(<HTMLInputElement>document.getElementById("fileDropRef")).value ="";
        }
      });
      //   this.disableClearFile = true;
    }
  }
  /**
    * @description Method to upload the file into s3 using Presigned URL
    * @param file - File to be uploaded
    * @param url - Presigned URL
    * @param renamedFileNm - File name 
    */
  uploadFile(file: File, url: string, renamedFileNm: string) {
    // this.isCompletedCount = 0;
    this.uploadSub = this._supportRequestService.fileUpload(file, url).pipe(takeUntil(this.destroy$)).subscribe(event => {
      //console.log("Response event Type", event.type);
      switch (event.type) {
        //Upoad is in progress
        case HttpEventType.UploadProgress:
          this.uploadProgress = Math.round((event.loaded / event.total) * 100);
          break;
        //upload is completed
        case HttpEventType.Response:
          this.uploadProgress = 100;
          let attachmentPayload =
            [
              {
                "ItemId": this.supportRequestId.toString(),
                "GUID": "",
                "FileName": renamedFileNm,
                "CreatedBy": this._sharedServices.getLoggedUsr().login,
                "Path": "",
                "AttachmentType": "Support Request",
                "ItemType": "SR"
              }
            ]

          this._supportRequestService.createSFAttachment(attachmentPayload).pipe(takeUntil(this.destroy$)).subscribe(
            (attachRes: any) => {
              this.hasAttachments = true;
              console.log("Successfully created Support Feedback");
              // To DO : Need to close popup or back to home page
            },
            (attachErr: any) => {
              console.log(attachErr);
              //this.modalService.dismissAll();
            }
          )
          break;
      }
    });
  }


  handleSaveApproveDeny(supportTypeRequestResult: number): void {
    console.log('Button clicked with value:', supportTypeRequestResult);
    let selectedCategoryId: number | null = null;

    let selectedImpactId: number | null = null;
    let selectedPriorityId: number | null = null;
    let selectedResponseCategoryId: number | null = null;
    let selectedStatusId: number | null = null;
    let comments: string = "";
    let managerNotify: boolean | null = null;
    let managerAcknowledged: boolean | null = null;
    let releaseDate: any;
    let releaseVersion: any;
    let releaseComments: any;
    let routeToWorkforce: boolean | null = null;
    let managerId: any;
    let latestResponseId: number = this.supportRequestResponseDetails?.Id ?? 0;
    let action: string = latestResponseId > 0 ? "U" : "C";
    managerNotify = this.supportRequestResponseDetails?.ManagerNotify ?? false;
    managerAcknowledged = this.supportRequestResponseDetails?.ManagerAcknowledged ?? false;
    managerId = this.supportRequestResponseDetails?.ManagerId ?? null;

    releaseDate = this.supportRequestResponseDetails?.ReleaseDate ?? null;
    releaseVersion = this.supportRequestResponseDetails?.ReleaseVersion ?? null;
    releaseComments = this.supportRequestResponseDetails?.ReleaseComments ?? null;
    routeToWorkforce = this.supportRequestResponseDetails?.RouteToWorkforce ?? false;
    if (this.supportType === SupportType.Governance) {
      selectedCategoryId = this.supportRequestResponseDetails?.SupportRequestResponseCatagoryId;
      selectedImpactId = this.supportRequestResponseDetails?.SupportRequestResponseImpactId;
      selectedPriorityId = this.supportRequestResponseDetails?.SupportRequestResponseCatagoryId;
      selectedResponseCategoryId = this.supportRequestResponseDetails?.SupportRequestResponseSubCategoryId;
      selectedStatusId = this.supportRequestResponseDetails?.SupportRequestResponseStatusId;
      comments = this.supportGovernanceDetailsForm.get('governanceComments')?.value;
    }
    if (this.supportType === SupportType.SupportFeedback) {
      selectedCategoryId = this.supportGovernanceDetailsForm.get('categorySelect')?.value;
      selectedImpactId = this.supportGovernanceDetailsForm.get('impactSelect')?.value;
      selectedPriorityId = this.supportGovernanceDetailsForm.get('prioritySelect')?.value;
      selectedResponseCategoryId = this.supportGovernanceDetailsForm.get('responseCategorySelect')?.value;
      selectedStatusId = this.supportGovernanceDetailsForm.get('statusSelect')?.value;
      comments = this.supportGovernanceDetailsForm.get('responseComments')?.value;
    }

    const assignedToPayload = {
      "id": this.supportRequestId,
      "userid": this._sharedServices.getLoggedUsr().login,
      "AssignedTo": this.newUserAssignedTo
    }
    this._supportRequestService.updateSupportRequestGovernance(assignedToPayload).pipe(takeUntil(this.destroy$)).subscribe(response => {
      console.log('Response from API updateSupportRequestGovernance:', response.result);
    }, error => {
      console.error('Error occurred in API call updateSupportRequestGovernance:', error);
    });



    // Prepare the payload
    const payload = {
      "Id": latestResponseId,
      "State": supportTypeRequestResult, // You can adjust the value based on action
      "SupportRequestId": this.supportRequestId,
      "SupportRequestResponseCatagoryId": selectedCategoryId,
      "SupportRequestResponseImpactId": selectedImpactId,
      "SupportRequestResponsePriorityId": selectedPriorityId,
      "LastModifiedBy": this._sharedServices.getLoggedUsr().login,
      "Comments": comments,
      "ManagerNotify": managerNotify,
      "ManagerAcknowledged": managerAcknowledged,
      "ManagerId": managerId,
      "ReleaseDate": releaseDate,
      "ReleaseVersion": releaseVersion,
      "ReleaseComments": releaseComments,
      "RouteToWorkforce": routeToWorkforce,
      "SupportRequestResponseSubCategoryId": selectedResponseCategoryId,
      "SupportRequestResponseStatusId": selectedStatusId,
      "Action": action
    };
    // Call the service method and pass the payload
    this._supportRequestService.createUpdateSupportRequestResponse(payload).pipe(takeUntil(this.destroy$)).subscribe(response => {
      console.log('Response from API createUpdateSupportRequestResponse API:', response.result);
      this.supportRequestResult = supportTypeRequestResult;
      this.getSupportRequestResponseDeatils();
      this.getSupportGovernanceDetails();
      this.setIsEditableFlag(this.supportGovernanceDetails);
      this.enableApproveDenyButtons(supportTypeRequestResult);
    }, error => {
      console.error('Error occurred in createUpdateSupportRequestResponse: ', error);
    });
  }

  enableApproveDenyButtons(event: any | null) {

    if (this.supportRequestResult === SupportRequestResult.NoResponse && this.supportType === SupportType.SupportFeedback) {
      this.disableApproveButtonForSupportFeedback = false;
      this.disableDenyButtonForSupportFeedback = false;
    }
    if (this.supportRequestResult === SupportRequestResult.NoResponse && this.supportType === SupportType.Governance) {
      this.disableApproveButtonForGovernance = false;
      this.disableDenyButtonForGovernance = false;
    }
  }

  downloadAttachment(attachment: any) {
    if (attachment.Path) {
      this._artFileUploadService.getAttachmentSupportRequests(attachment.FileName, this.supportRequestId).pipe(takeUntil(this.destroy$)).subscribe((res) => {
        let aTag = document.createElement('a');
        document.body.appendChild(aTag);
        aTag.setAttribute('style', 'display: none');
        aTag.href = res['fileUrl'];
        aTag.download = attachment.FileName;
        aTag.click();
        window.URL.revokeObjectURL(res['fileUrl']);
        aTag.remove();
      });
    }
  }

  redirectToLegacyAppHomeScreen() {
    window.location.href = environment.legacyAppUrl;
  }

  UTCToEasternTime(date: string): string {
    if (!date) return '';

    if (!date.endsWith('Z')) {
      date = date + 'Z';
    }

    const utcDateTime = new Date(date);

    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(utcDateTime);

  }
  getSupportRequestResponseDeatils() {
    this._supportRequestService.getSupportRequestResponse({
      id: this.supportRequestId,
      userid: this.loggedinUser
    })
      .pipe(
        takeUntil(this.destroy$) // Ensures cleanup on component destroy
      )
      .subscribe({
        next: (requestResponse) => {
          if (requestResponse?.result?.SupportRequestResponseDetails?.length > 0) {
            this.supportRequestResponseDetails = requestResponse.result.SupportRequestResponseDetails[0];
            this.updateDropDownTitles(this.supportRequestResponseDetails);
          }
          console.log('Support Request Response Deatils after Save:', requestResponse);
        },
        error: (error) => {
          console.error('Error fetching Support Request Response Details After Save:', error);
        }
      });
  }
  getSupportGovernanceDetails() {
    this._supportRequestService.getSupportGovernanceDetails({
      id: this.supportRequestId,
      userid: this.loggedinUser
    })
      .pipe(
        takeUntil(this.destroy$) // Ensures cleanup on component destroy
      )
      .subscribe({
        next: (requestDetails) => {
          if (requestDetails?.result?.SupportRequestGovernanceDetails?.length > 0) {
            this.supportGovernanceDetails = requestDetails.result.SupportRequestGovernanceDetails[0];
          }
          console.log('Support Request  Deatils after Save:', requestDetails);
        },
        error: (error) => {
          console.error('Error fetching Support Request  Details After Save:', error);
        }
      });
  }
  //Category Dropdown
  categories = [];
  selectedCategoryId: number | null = null;
  enableCategoryDropdown: boolean = false;

  //Impact Dropdown
  impacts = [];
  selectedImpactId: number | null = null;
  enableImpactDropdown: boolean = false;

  //Response Category Dropdown
  responseCategories = [];
  selectedResponseCategoryId: number | null = null;
  enableResponseCategoryDropdown: boolean = false;

  //Status Dropdown
  selectedStatusId: number | null = null;
  enableStatusDropdown: boolean = false;

  notifyManager: boolean = false;
  routeToWorkforce: boolean = false;

  priorities = [];
  selectedPriorityId: number | null = null;
  enablePriorityDropdown: boolean = false;

  // Selected values
  selectedCategory: string | null = null;
  selectedImpact: string | null = null;
  selectedPriority: string | null = null;

  editable: boolean = true;
  userIsAdmin: boolean = false;
}