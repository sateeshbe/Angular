import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { forkJoin, Subject, Subscription, takeUntil } from 'rxjs';

import { ArtCommonService } from 'src/app/art-common/art-common.service';
import { SupportRequestService } from '../support-request.service';
import { UsersList } from 'src/app/action-items/art-interface/common';
import { AdminUserService } from 'src/app/admin-user/admin-user.service';
import { ArtFileUploadService } from 'src/app/action-items/art-RR-common/art-file-upload/art-file-upload.service';

import { 
  SupportRequestGovernance_Backdate_Page, 
  SupportRequestGovernanceType,
  SupportRequestResult, 
  SupportRequestType, 
  SupportType, 
  SupportRequestGovernanceTypeDisplay,
} from '../models/support-request-enum';
import { GENERIC_CONSTANT } from 'src/app/generic-workflow/models/constants';
import { ART_CONSTANTS } from 'src/app/models/constant';
import { ART_CONSTANTS_RR } from 'src/app/action-items/models/constant';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-support-request-view-edit',
  templateUrl: './support-request-view-edit.component.html',
  styleUrls: ['./support-request-view-edit.component.scss']
})
export class SupportRequestViewEditComponent implements OnInit, OnDestroy {
  // Component destruction subject
  private destroy$ = new Subject<void>();
  
  // Constants and enumerations for use in template
  readonly SupportTypeEnum = SupportType;
  readonly SupportRequestGovernanceTypeEnum = SupportRequestGovernanceType;
  readonly SupportRequestResultEnum = SupportRequestResult;
  readonly SupportRequestGovernance_Backdate_PageEnum = SupportRequestGovernance_Backdate_Page;
  
  // Form and UI state
  supportGovernanceDetailsForm: FormGroup;
  pageTitle: string = "";
  isEditable: boolean = false;
  isAdmin: boolean = false;
  
  // File handling
  file: File;
  uploadSub: Subscription;
  uploadProgress: number;
  hasAttachments: boolean = false;
  sizeLimit: number = environment.fileSizeLimit;
  
  // User information
  loggedinUser: string = "";
  userListRes: UsersList[];
  userListNoMatch: boolean;
  duplicateUserName: boolean;
  assignedToValue: UsersList;
  
  // Request data
  supportGovernanceDetails: any;
  supportRequestResponseDetails: any;
  supportRequestId: number = 0;
  
  // Request state properties
  supportType: number = SupportType.SupportFeedback;
  supportRequestGovernanceType: number = SupportRequestGovernanceType.Backdate;
  supportRequestGovernance_Backdate_Page: number = SupportRequestGovernance_Backdate_Page.ActionItem;
  supportRequestResult: number = SupportRequestResult.NoResponse;
  backdate_PageType: number = SupportRequestGovernance_Backdate_Page.ActionItem;
  
  // Dropdown options
  categoryDropDownOptions: any[];
  impactDropDownOptions: any[];
  priorityDropDownOptions: any[];
  statusDropDownOptions: any[];
  responseCategoryDropDownOptions: any[];
  
  // Selected dropdown values
  selectedCategoryId: number | null = null;
  selectedImpactId: number | null = null;
  selectedPriorityId: number | null = null;
  selectedResponseCategoryId: number | null = null;
  selectedStatusId: number | null = null;
  
  // Title values for display
  selectedCategoryTitle: string = "";
  selectedImpactTitle: string = "";
  selectedPriorityTitle: string = "";
  selectedStatusTitle: string = "";
  selectedResponseCategoryTitle: string = "";
  
  // Formatted date values
  requestedDateInCustomFormat: string = "";
  backdate_NewDateInCustomFormat: string = "";
  backdate_PageTitle: string = "";
  
  // Button state
  disableDenyButtonForSupportFeedback: boolean = true;
  disableApproveButtonForSupportFeedback: boolean = true;
  disableDenyButtonForGovernance: boolean = true;
  disableApproveButtonForGovernance: boolean = true;
  
  // User assignment
  existingUserAssignedTo: string = "";
  newUserAssignedTo: string = "";

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

  async ngOnInit(): Promise<void> {
    this.initializeForm();
    await this.loadData();
    this.startActivityLogging();
  }

  ngOnDestroy(): void {
    // Cancel any active upload subscription
    if (this.uploadSub) {
      this.uploadSub.unsubscribe();
    }
    
    // Complete the destroy subject to unsubscribe from all observables
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
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
  }

  private async loadData(): Promise<void> {
    try {
      // Get logged-in user
      const loggedinUser = await this._sharedServices.getLoggedUsr().login;
      this.loggedinUser = loggedinUser;
      
      // Get request ID from route
      const id = this._route.snapshot.paramMap.get('id');
      this.supportRequestId = id ? +id : 0;
      
      // Fetch all required data in parallel
      this.fetchSupportRequestData();
    } catch (error) {
      console.error("Error loading initial data:", error);
    }
  }

  private fetchSupportRequestData(): void {
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
        id: this.supportRequestId,
        userid: this.loggedinUser
      }),
      requestResponse: this._supportRequestService.getSupportRequestResponse({
        id: this.supportRequestId,
        userid: this.loggedinUser
      })
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.processDropdownOptions(data);
        this.processSupportGovernanceDetails(data.details);
        this.processSupportRequestResponse(data.requestResponse);
      },
      error: (err) => console.error("Error fetching data:", err)
    });
  }

  private processDropdownOptions(data: any): void {
    this.categoryDropDownOptions = data.categoryOptions.result;
    this.impactDropDownOptions = data.impactOptions.result;
    this.priorityDropDownOptions = data.priorityOptions.result;
    this.statusDropDownOptions = data.statusOptions.result;
    this.responseCategoryDropDownOptions = data.responseCategoryOptions.result;
  }

  private processSupportGovernanceDetails(details: any): void {
    if (details?.result?.SupportRequestGovernanceDetails?.length > 0) {
      this.supportGovernanceDetails = details.result.SupportRequestGovernanceDetails[0];
      this.supportType = this.supportGovernanceDetails?.SupportType;
      this.backdate_PageType = this.supportGovernanceDetails?.Backdate_Page;
      this.supportRequestGovernanceType = this.supportGovernanceDetails?.SupportGovernanceType;
      this.supportRequestResult = this.supportGovernanceDetails?.SupportRequestResultId;
      
      this.determineBackdatePage();
      this.setPageTitle();
      this.setIsEditableFlag(this.supportGovernanceDetails);
      this.isAdmin = this.isUserAnAdmin();
      this.hasAttachments = this.supportGovernanceDetails?.AttachmentDetails && 
                           this.supportGovernanceDetails?.AttachmentDetails.length > 0;
      
      if (this.supportGovernanceDetails.AssignedTo) {
        this.updateAssignToValue(this.supportGovernanceDetails.AssignedTo);
      }
      
      this.requestedDateInCustomFormat = this.UTCToEasternTime(this.supportGovernanceDetails?.RequestedDate);
      this.backdate_NewDateInCustomFormat = this.UTCToEasternTime(this.supportGovernanceDetails?.Backdate_NewDate);
    }
  }

  private processSupportRequestResponse(requestResponse: any): void {
    if (requestResponse?.result?.SupportRequestResponseDetails?.length > 0) {
      this.supportRequestResponseDetails = requestResponse.result.SupportRequestResponseDetails[0];
      this.updateDropDownTitles(this.supportRequestResponseDetails);
      this.setDropdowns();
    }
  }

  private startActivityLogging(): void {
    this._supportRequestService.startActionItemActivityLog();
    this._sharedServices.startCommonActivityLog(
      undefined, 
      this.supportRequestId, 
      ART_CONSTANTS_RR.SUPPORT_FEEDBACK_LOG.DETAILS.CNTRL,
      ART_CONSTANTS_RR.SUPPORT_FEEDBACK_LOG.DETAILS.ACT, 
      "", 
      ""
    );
    this._sharedServices.startSaveErrorLog("SupportFeedbackEdit", "Support-request");
  }

  private determineBackdatePage(): void {
    if (this.supportGovernanceDetails?.Backdate_Outreach_Field === 1) {
      this.supportRequestGovernance_Backdate_Page = SupportRequestGovernance_Backdate_Page.OutREACH;
      this.backdate_PageTitle = "OutREACH";
    } else if (this.supportGovernanceDetails?.Backdate_ActionItem_Field === 1) {
      this.supportRequestGovernance_Backdate_Page = SupportRequestGovernance_Backdate_Page.ActionItem;
      this.backdate_PageTitle = "ActionItem";
    } else {
      this.supportRequestGovernance_Backdate_Page = -1;
      this.backdate_PageTitle = "Unknown";
    }
  }

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

  isUserAnAdmin(): boolean {
    return this.supportGovernanceDetails?.UserIsAdmin === true;
  }

  setDropdowns(): void {
    // Patch values to form
    this.supportGovernanceDetailsForm.patchValue({ 
      categorySelect: this.supportRequestResponseDetails?.SupportRequestResponseCatagoryId ?? null,
      impactSelect: this.supportRequestResponseDetails?.SupportRequestResponseImpactId ?? null,
      prioritySelect: this.supportRequestResponseDetails?.SupportRequestResponsePriorityId ?? null,
      responseCategorySelect: this.supportRequestResponseDetails?.SupportRequestResponseSubCategoryId ?? null,
      statusSelect: this.supportRequestResponseDetails?.SupportRequestResponseStatusId ?? null,
      responseComments: this.supportRequestResponseDetails?.Comments,
      governanceComments: this.supportRequestResponseDetails?.Comments
    });
  }

  updateDropDownTitles(supportRequestResponseDetails: any): void {
    this.selectedCategoryTitle = supportRequestResponseDetails?.SupportRequestResponseCatagory;
    this.selectedImpactTitle = supportRequestResponseDetails?.SupportRequestResponseImpact;
    this.selectedPriorityTitle = supportRequestResponseDetails?.SupportRequestResponsePriority;
    this.selectedResponseCategoryTitle = supportRequestResponseDetails?.SupportRequestResponseSubCategory;
    this.selectedStatusTitle = supportRequestResponseDetails?.SupportRequestResponseStatus;
  }

  // User search and selection methods
  searchUserList(event: any): void {
    this.userListNoMatch = false;
    this.duplicateUserName = false;
    
    if (event.query.length > 1) {
      const userSpecialChaReplace = event.query.replace(/\\/g, '\\\\');
      const userSearchList = {
        "P_UserName": userSpecialChaReplace
      };
      
      this._supportRequestService.getSearchList(userSearchList)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            const userlist = response.result || [];
            this.userListNoMatch = (userlist.length === 0);
            this.userListRes = this._sharedServices.userNameAddLANID(userlist);
          },
          error: (error) => {
            console.error("Error searching for users:", error);
          }
        });
    }
  }

  updateAssignToValue(username: string): void {
    const userSearchList = {
      "P_UserName": username
    };
    
    this._supportRequestService.getSearchList(userSearchList)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          let userlist = [];
          
          if (response.result && response.result.length !== 0) {
            userlist = response.result;
          } else {
            userlist.push({
              fax: "",
              firstname: "",
              lastname: "",
              phone: "",
              phoneextension: "",
              useremail: "",
              userid: "",
              username: username
            });
          }
          
          this.userListNoMatch = (userlist.length === 0);
          userlist = this._sharedServices.userNameAddLANID(userlist);
          this.userListRes = userlist;
          
          const matchedUser = this.userListRes.find((x: any) => x.username === username);
          if (matchedUser) {
            this.assignedToValue = matchedUser;
          }
        },
        error: (error) => {
          console.error("Error retrieving assigned user:", error);
        }
      });
  }

  checkUser(): void {
    this.newUserAssignedTo = this.supportGovernanceDetailsForm.get("assignToFormControl").value?.userid;
  }

  onSelect(event: any): void {
    this.newUserAssignedTo = this.supportGovernanceDetailsForm.get("assignToFormControl").value?.userid;
  }

  onClear(event: any): void {
    this.newUserAssignedTo = this.supportGovernanceDetailsForm.get("assignToFormControl").value?.userid;
  }

  // File handling methods
  onFileChange(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const isValidFile = this.checkFilePrerequisites(file);
      
      if (isValidFile) {
        this.file = file;
        this.uploadFileToS3();
      }
    }
  }

  private checkFilePrerequisites(file: File): boolean {
    const extension = file.name.lastIndexOf('.');
    const fileExtension = file.name.substring(extension + 1).toLowerCase();
    const fileSize = file.size / (1024 ** 2);
    
    if (ART_CONSTANTS.ALLOWED_FILE_TY.includes(fileExtension) && fileSize <= environment.fileSizeLimitRnR) {
      return true;
    } else if (!ART_CONSTANTS.ALLOWED_FILE_TY.includes(fileExtension)) {
      this.displayErrorMessage("Please select a file with the allowed extensions");
      return false;
    } else if (fileSize > environment.fileSizeLimitRnR) {
      const formattedFileSize = this.formatBytes(file.size);
      const errorMsg = `File ${file.name} (${formattedFileSize}) exceeds maximum allowed upload size of ${environment.fileSizeLimitRnR} MB`;
      this.displayErrorMessage(errorMsg);
      return false;
    }
    
    return false;
  }

  private displayErrorMessage(message: string): void {
    this._messageService.add({ severity: 'error', summary: 'Failure', detail: message });
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) {
      return '0 Bytes';
    }
    
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  private uploadFileToS3(): void {
    if (!this.file) {
      return;
    }
    
    // Prepare file name
    const extension = this.file.name.lastIndexOf('.');
    const fileNameWOE = this.file.name.substring(0, extension);
    const fileExtension = this.file.name.substring(extension);
    const documentName = fileNameWOE + '_' + this._sharedServices.getLoggedUsr().lanID +
      '_' + this._datePipe.transform(Date.now(), ART_CONSTANTS.FILE_NM_DT_FORM) + fileExtension;
    const filename = "SupportRequests/" + this.supportRequestId + "/" + documentName;
    
    // Get pre-signed URL
    this._supportRequestService.getPreSignedUrl(filename)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const preSignedUrl = response[ART_CONSTANTS.API_RES.RESULT].presignedURL;
          
          if (preSignedUrl) {
            this.uploadFile(this.file, preSignedUrl, documentName);
          }
        },
        error: (error) => {
          console.error("Error getting pre-signed URL:", error);
          this.displayErrorMessage("Failed to prepare upload location");
        }
      });
  }

  private uploadFile(file: File, url: string, renamedFileNm: string): void {
    // Cancel previous upload if exists
    if (this.uploadSub) {
      this.uploadSub.unsubscribe();
    }
    
    this.uploadSub = this._supportRequestService.fileUpload(file, url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (event) => {
          switch (event.type) {
            case HttpEventType.UploadProgress:
              this.uploadProgress = Math.round((event.loaded / event.total) * 100);
              break;
              
            case HttpEventType.Response:
              this.uploadProgress = 100;
              this.createAttachmentRecord(renamedFileNm);
              break;
          }
        },
        error: (error) => {
          console.error("Error uploading file:", error);
          this.displayErrorMessage("Failed to upload file");
        }
      });
  }

  private createAttachmentRecord(fileName: string): void {
    const attachmentPayload = [
      {
        "ItemId": this.supportRequestId.toString(),
        "GUID": "",
        "FileName": fileName,
        "CreatedBy": this._sharedServices.getLoggedUsr().login,
        "Path": "",
        "AttachmentType": "Support Request",
        "ItemType": "SR"
      }
    ];
    
    this._supportRequestService.createSFAttachment(attachmentPayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.hasAttachments = true;
          this._messageService.add({ 
            severity: 'success', 
            summary: 'Success', 
            detail: 'File uploaded successfully' 
          });
        },
        error: (error) => {
          console.error("Error creating attachment record:", error);
          this.displayErrorMessage("Failed to save attachment information");
        }
      });
  }

  downloadAttachment(attachment: any): void {
    if (attachment.Path) {
      this._artFileUploadService.getAttachmentSupportRequests(attachment.FileName, this.supportRequestId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            const aTag = document.createElement('a');
            document.body.appendChild(aTag);
            aTag.setAttribute('style', 'display: none');
            aTag.href = res['fileUrl'];
            aTag.download = attachment.FileName;
            aTag.click();
            window.URL.revokeObjectURL(res['fileUrl']);
            aTag.remove();
          },
          error: (error) => {
            console.error("Error downloading attachment:", error);
            this.displayErrorMessage("Failed to download file");
          }
        });
    }
  }

  // Action handling methods
  handleSaveApproveDeny(supportTypeRequestResult: number): void {
    // Update assigned user first
    this.updateAssignedUser()
      .then(() => this.updateSupportRequestResponse(supportTypeRequestResult))
      .catch(error => {
        console.error("Error handling save/approve/deny:", error);
        this.displayErrorMessage("Failed to save changes");
      });
  }
  
  private async updateAssignedUser(): Promise<void> {
    if (!this.newUserAssignedTo) {
      return;
    }
    
    const assignedToPayload = {
      "id": this.supportRequestId,
      "userid": this._sharedServices.getLoggedUsr().login,
      "AssignedTo": this.newUserAssignedTo
    };
    
    return new Promise<void>((resolve, reject) => {
      this._supportRequestService.updateSupportRequestGovernance(assignedToPayload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => resolve(),
          error: (error) => reject(error)
        });
    });
  }
  
  private updateSupportRequestResponse(supportTypeRequestResult: number): void {
    let selectedCategoryId = null;
    let selectedImpactId = null;
    let selectedPriorityId = null;
    let selectedResponseCategoryId = null;
    let selectedStatusId = null;
    let comments = "";
    
    // Get values based on support type
    if (this.supportType === SupportType.Governance) {
      selectedCategoryId = this.supportRequestResponseDetails?.SupportRequestResponseCatagoryId;
      selectedImpactId = this.supportRequestResponseDetails?.SupportRequestResponseImpactId;
      selectedPriorityId = this.supportRequestResponseDetails?.SupportRequestResponseCatagoryId;
      selectedResponseCategoryId = this.supportRequestResponseDetails?.SupportRequestResponseSubCategoryId;
      selectedStatusId = this.supportRequestResponseDetails?.SupportRequestResponseStatusId;
      comments = this.supportGovernanceDetailsForm.get('governanceComments')?.value;
    } else if (this.supportType === SupportType.SupportFeedback) {
      selectedCategoryId = this.supportGovernanceDetailsForm.get('categorySelect')?.value;
      selectedImpactId = this.supportGovernanceDetailsForm.get('impactSelect')?.value;
      selectedPriorityId = this.supportGovernanceDetailsForm.get('prioritySelect')?.value;
      selectedResponseCategoryId = this.supportGovernanceDetailsForm.get('responseCategorySelect')?.value;
      selectedStatusId = this.supportGovernanceDetailsForm.get('statusSelect')?.value;
      comments = this.supportGovernanceDetailsForm.get('responseComments')?.value;
    }
    
    // Prepare additional data from existing response
    const latestResponseId = this.supportRequestResponseDetails?.Id ?? 0;
    const action = latestResponseId > 0 ? "U" : "C";
    const managerNotify = this.supportRequestResponseDetails?.ManagerNotify ?? false;
    const managerAcknowledged = this.supportRequestResponseDetails?.ManagerAcknowledged ?? false;
    const managerId = this.supportRequestResponseDetails?.ManagerId ?? null;
    const releaseDate = this.supportRequestResponseDetails?.ReleaseDate ?? null;
    const releaseVersion = this.supportRequestResponseDetails?.ReleaseVersion ?? null;
    const releaseComments = this.supportRequestResponseDetails?.ReleaseComments ?? null;
    const routeToWorkforce = this.supportRequestResponseDetails?.RouteToWorkforce ?? false;
    
    // Prepare payload
    const payload = {
      "Id": latestResponseId,
      "State": supportTypeRequestResult,
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
    
    // Update support request response
    this._supportRequestService.createUpdateSupportRequestResponse(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.supportRequestResult = supportTypeRequestResult;
          this.getSupportRequestResponseDetails();
          this.getSupportGovernanceDetails();
          this.enableApproveDenyButtons(supportTypeRequestResult);
          
          this._messageService.add({ 
            severity: 'success', 
            summary: 'Success', 
            detail: 'Request updated successfully' 
          });
        },
        error: (error) => {
          console.error('Error updating support request response:', error);
          this.displayErrorMessage("Failed to update the request");
        }
      });
  }

  enableApproveDenyButtons(event: any | null): void {
    if (this.supportRequestResult === SupportRequestResult.NoResponse) {
      if (this.supportType === SupportType.SupportFeedback) {
        this.disableApproveButtonForSupportFeedback = false;
        this.disableDenyButtonForSupportFeedback = false;
      } else if (this.supportType === SupportType.Governance) {
        this.disableApproveButtonForGovernance = false;
        this.disableDenyButtonForGovernance = false;
      }
    }
  }

  getSupportRequestResponseDetails(): void {
    this._supportRequestService.getSupportRequestResponse({
      id: this.supportRequestId,
      userid: this.loggedinUser
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (requestResponse) => {
        if (requestResponse?.result?.SupportRequestResponseDetails?.length > 0) {
          this.supportRequestResponseDetails = requestResponse.result.SupportRequestResponseDetails[0];
          this.updateDropDownTitles(this.supportRequestResponseDetails);
        }
      },
      error: (error) => {
        console.error('Error fetching support request response details:', error);
      }
    });
  }

  getSupportGovernanceDetails(): void {
    this._supportRequestService.getSupportGovernanceDetails({
      id: this.supportRequestId,
      userid: this.loggedinUser
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (requestDetails) => {
        if (requestDetails?.result?.SupportRequestGovernanceDetails?.length > 0) {
          this.supportGovernanceDetails = requestDetails.result.SupportRequestGovernanceDetails[0];
          this.setIsEditableFlag(this.supportGovernanceDetails);
        }
      },
      error: (error) => {
        console.error('Error fetching support governance details:', error);
      }
    });
  }
  
  // Utility methods
  UTCToEasternTime(date: string): string {
    if (!date) return '';

    // Ensure date ends with Z for UTC
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

  redirectToLegacyAppHomeScreen(): void {
    window.location.href = environment.legacyAppUrl;
  }