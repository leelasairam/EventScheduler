import { LightningElement,api } from 'lwc';
import { NavigationMixin } from "lightning/navigation";
import getCaseDetails from '@salesforce/apex/EventSchedulerController.getCaseDetails';
export default class EventCalenderNavigator extends NavigationMixin(LightningElement) {
    @api recordId;
    caseNumber;
    msg = 'Fetching case datails...';

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
            this.caseNumber = result.CaseNumber;
            this.navigateToCase();
        })
        .catch(error=>{
            console.log(error);
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
                c__caseNumber : this.caseNumber
            }
        }).then(url => {
            // Open the generated URL in a new tab
            window.open(url, "_blank");
            setTimeout(()=>{
                this.msg = "Opened 'Event Scheduler' page in next tab."
            },2000)
        });
    }
}