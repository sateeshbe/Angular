656    // Update support request response
657    this._supportRequestService.createUpdateSupportRequestResponse(payload)
658      .pipe(takeUntil(this.destroy$))
659      .subscribe({
660        next: () => {
661          this.supportRequestResult = supportTypeRequestResult;
662          this.getSupportRequestResponseDetails();
663          this.getSupportGovernanceDetails();
664          this.enableApproveDenyButtons(supportTypeRequestResult);
665          
666          this._messageService.add({ 
667            severity: 'success', 
668            summary: 'Success', 
669            detail: 'Request updated successfully' 
670          });
671        },
672        error: (error) => {
673          console.error('Error updating support request response:', error);
674          this.displayErrorMessage("Failed to update the request");
675        }
676      });
677  }
678
679  enableApproveDenyButtons(event: any | null): void {
680    if (this.supportRequestResult === SupportRequestResult.NoResponse) {
681      if (this.supportType === SupportType.SupportFeedback) {
682        this.disableApproveButtonForSupportFeedback = false;
683        this.disableDenyButtonForSupportFeedback = false;
684      } else if (this.supportType === SupportType.Governance) {
685        this.disableApproveButtonForGovernance = false;
686        this.disableDenyButtonForGovernance = false;
687      }
688    }
689  }
690
691  getSupportRequestResponseDetails(): void {
692    this._supportRequestService.getSupportRequestResponse({
693      id: this.supportRequestId,
694      userid: this.loggedinUser
695    })
696    .pipe(takeUntil(this.destroy$))
697    .subscribe({
698      next: (requestResponse) => {
699        if (requestResponse?.result?.SupportRequestResponseDetails?.length > 0) {
700          this.supportRequestResponseDetails = requestResponse.result.SupportRequestResponseDetails[0];
701          this.updateDropDownTitles(this.supportRequestResponseDetails);
702        }
703      },
704      error: (error) => {
705        console.error('Error fetching support request response details:', error);
706      }
707    });
708  }
709
710  getSupportGovernanceDetails(): void {
711    this._supportRequestService.getSupportGovernanceDetails({
712      id: this.supportRequestId,
713      userid: this.loggedinUser
714    })
715    .pipe(takeUntil(this.destroy$))
716    .subscribe({
717      next: (requestDetails) => {
718        if (requestDetails?.result?.SupportRequestGovernanceDetails?.length > 0) {
719          this.supportGovernanceDetails = requestDetails.result.SupportRequestGovernanceDetails[0];
720          this.setIsEditableFlag(this.supportGovernanceDetails);
721        }
722      },
723      error: (error) => {
724        console.error('Error fetching support governance details:', error);
725      }
726    });
727  }
728  
729  // Utility methods
730  UTCToEasternTime(date: string): string {
731    if (!date) return '';
732
733    // Ensure date ends with Z for UTC
734    if (!date.endsWith('Z')) {
735      date = date + 'Z';
736    }
737
738    const utcDateTime = new Date(date);
739
740    return new Intl.DateTimeFormat('en-US', {
741      timeZone: 'America/New_York',
742      year: 'numeric',
743      month: '2-digit',
744      day: '2-digit',
745      hour: '2-digit',
746      minute: '2-digit',
747      second: '2-digit',
748      hour12: true
749    }).format(utcDateTime);
750  }
751
752  redirectToLegacyAppHomeScreen(): void {
753    window.location.href = environment.legacyAppUrl;
754  }
755}