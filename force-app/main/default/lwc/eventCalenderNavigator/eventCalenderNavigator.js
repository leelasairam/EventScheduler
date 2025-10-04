import { LightningElement,api } from 'lwc';
import { NavigationMixin } from "lightning/navigation";
import getCaseDetails from '@salesforce/apex/EventSchedulerController.getCaseDetails';
import cancelEvent from '@salesforce/apex/EventSchedulerController.cancelEvent';
import { CloseActionScreenEvent } from 'lightning/actions';
export default class EventCalenderNavigator extends NavigationMixin(LightningElement) {
    @api recordId;
    caseNumber;
    caseAssigned=false;
    caseEvts = [];
    msg = 'Fetching case datails...';
    btnLabel = 'Add Additional Resource';
    showBtn = false;

    connectedCallback(){
        console.log(this.recordId);
        setTimeout(()=>{
            this.fetchCase();
        },1000);
    }

    fetchCase(){
        getCaseDetails({CaseId:this.recordId})
        .then(result=>{
            this.msg = 'Navigating to Event Calender...'
            this.caseNumber = result.caseDetails.CaseNumber;
            this.caseAssigned = result.isCaseAssigned;
            this.caseEvts = result.caseEvents.map(e=>({...e,Owner:e.Owner.Name}));
            if(!this.caseAssigned){
                this.navigateToCase();
            }
            else{
                this.msg = `- This case was already assigned via below event. Please cancel the below event to change the assignee.
                - Or click on "Add Additional Resource" button to add additional resource to this case.`;
                this.showBtn = true;
            }
        })
        .catch(error=>{
            console.log('error',error);
            this.msg = 'Something went wrong '+error;
        })
    }

    navigateToCase() {
        console.log(this.recordId);
    
        // Generate the URL first
        this[NavigationMixin.GenerateUrl]({
            type: 'standard__component',
            attributes: {
                componentName: 'c__eventCalender',
            },
            state: {
                c__caseId: this.recordId,
                c__caseNumber : this.caseNumber,
                c__additionalRes : this.caseAssigned
            }
        })
        .then(url => {
            // Open the generated URL in a new tab
            window.open(url, "_blank");
            setTimeout(()=>{
                this.msg = "Opened 'Event Scheduler' page in next tab."
            },2000)
        })
        .finally(()=>{
            setTimeout(()=>{
                this.msg = "Tab closed";
                this.closeQuickAction();
            },2000)
        })
    }

    cancelEvt(event){
        const eventId = event.target.dataset.evtid;
        cancelEvent({evtId:eventId})
        .then(result=>{
            this.caseAssigned = false;
            this.msg = 'Event cancelled successfully';
            this.btnLabel = 'Navigate to Event Scheduler';
        })
        .catch(error=>{
            this.msg = `Something we wrong ${error}`;
            console.log(error);
        })
    }

    closeQuickAction() {
        this.dispatchEvent(new CloseActionScreenEvent());
    }
}