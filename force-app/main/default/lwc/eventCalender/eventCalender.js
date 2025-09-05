import { LightningElement, track } from 'lwc';
import createEvent from '@salesforce/apex/EventSchedulerController.createEvent';
import getEvents from '@salesforce/apex/EventSchedulerController.getEvents';
import updateEvt from '@salesforce/apex/EventSchedulerController.updateEvt';
import UserId from '@salesforce/user/Id';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
export default class EventCalender extends LightningElement {
    @track year;
    @track month;
    @track days = [];
    weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    newEventModal = false;
    allEventModal = false;
    editEventModal = false;
    currentUserId = UserId;
    @track dateEvents = [];
    @track defultDateTime;
    loading = false;
    refreshId = new Date().toISOString();
    @track editEventRecord = {};
    displaySelectedDate = '';

    @track events = [
        /*{ date: '2025-08-21', title: 'Team Meeting' },
        { date: '2025-08-25', title: 'Demo' },
        { date: '2025-08-25', title: 'Demo1' },
        { date: '2025-08-25', title: 'Demo2' },
        { date: '2025-08-25', title: 'Demo3' }*/
    ];

    evtStatusValues = [
            { label: 'New', value: 'New' },
            { label: 'On Hold', value: 'OnHold' },
            { label: 'Completed', value: 'Completed' },
            { label: 'Cancelled', value: 'Cancelled' },
        ];

    connectedCallback() {
        let today = new Date();
        this.year = today.getFullYear();
        this.month = today.getMonth();
        this.fetchEvents();
    }

    showToast(title,msg,varient) {
        const event = new ShowToastEvent({
            title: title,
            message: msg,
            variant: varient,
            mode: 'dismissable'
        });
        this.dispatchEvent(event);
    }

    async fetchEvents(){
        this.loading = true;
        const monthYearStr = new Date(this.year, this.month).toLocaleString('default', { month: 'long' })+this.year;
        console.log(monthYearStr,this.currentUserId);
        await getEvents({monthYear:monthYearStr,UId:this.currentUserId,refreshId:this.refreshId})
        .then(result=>{
            this.events = result.map(e=>({...e,date:e.Start_Date__c,title:e.Name.length>15 ? e.Name.slice(0, 15) + '...' : e.Name}));
            console.log(JSON.stringify(this.events));
        })
        .catch(error=>{
            console.log(error);
        })
        .finally(()=>{
            this.generateCalendar();
            this.loading = false;
        })
    }

    get monthName() {
        return new Date(this.year, this.month).toLocaleString('default', { month: 'long' });
    }

    generateCalendar() {
        this.days = [];
        let firstDay = new Date(this.year, this.month, 1).getDay();
        let daysInMonth = new Date(this.year, this.month+1, 0).getDate();

        // Empty slots before first day
        for (let i = 0; i < firstDay; i++) {
            this.days.push({ key: 'blank'+i, date: '',isPreviousMonthDate:true });
        }

        // Actual days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${this.year}-${String(this.month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const evt = this.events.filter(e => e.date === dateStr);
            console.log(JSON.stringify(evt));
            this.days.push({ key: d, date: d, events: evt ? evt : null,multipleEvents:evt.length>2 ? true : false,initialEvents: evt ? evt.slice(0,2) : null,isPreviousMonthDate:false,evtCount:evt ? `View all ${evt.length} events` : null});
        }
    }

    handlePrev() {
        this.month--;
        if (this.month < 0) {
            this.month = 11;
            this.year--;
        }
        this.fetchEvents();
    }

    handleNext() {
        this.month++;
        if (this.month > 11) {
            this.month = 0;
            this.year++;
        }
        this.fetchEvents();
    }

    handleDayClick(event) {
        let day = event.target.dataset.date;
        if (day) {
            const month = this.month.toString().length == 1 ? `0${this.month +1}` : `${this.month +1}`;
            const formattedDate = day.toString().length == 1 ? `0${day}` : `${day}`;
            this.defultDateTime = `${this.year}-${month}-${formattedDate}T09:00`;
            console.log(this.defultDateTime);
            //alert(`Clicked on ${day} ${this.monthName} ${this.year}`);
            this.newEventModal = true;
        }
    }

    closeNewEventModal(){
        this.newEventModal = false;
    }

    async save(){
        this.loading = true;
        const title =  this.template.querySelector(".evt-form-title").value;
        const Start =  new Date(this.template.querySelector(".evt-form-startdate").value);
        const End =  new Date(this.template.querySelector(".evt-form-enddate").value);
        if(title=='' || title == null){
            this.showToast('Please enter event title','','error');
            return;
        }
        await createEvent({startDate:Start,endDate:End,eventName:title})
        .then(result=>{
            console.log(result);
            this.showToast('Success',`Event ${result} created successfully`,'success');
            //this.events.push({...result,date:result.Start_Date__c,title:result.Name})
            this.closeNewEventModal();
            this.refresh();
        })
        .catch(error=>{
            console.log(error);
            this.showToast('Error',error.body.message,'error');
        })
        .finally(()=>{
            this.loading = false;
        })
    }

    showAllEvents(event){
        const day = event.target.dataset.date;
        const month = this.month.toString().length == 1 ? `0${this.month +1}` : `${this.month +1}`;
        const formattedDate = day.toString().length == 1 ? `0${day}` : `${day}`;
        const date = `${this.year}-${month}-${formattedDate}`;
        this.displaySelectedDate = date;
        this.dateEvents = this.events.filter(de=>de.date==date);
        this.allEventModal = true;
    }

    closeAllEventModal(){
        this.allEventModal = false;
    }

    refresh(){
        this.refreshId = new Date().toISOString();
        this.fetchEvents();
    }

    navigateToEvent(event){
        console.log(event.target.dataset.id);
        let url = `/${event.target.dataset.id}`;
        console.log(url)
        window.open(url,"_blank")
    }

    closeEditEventModal(){
        this.editEventModal = false;
        this.allEventModal = true;
    }

    handleEditEvent(event){
        const evtId = event.target.dataset.eventid;
        this.allEventModal = false;
        this.editEventModal = true;
        this.editEventRecord = this.events.find(evt=>evt.Id==evtId);
    }

    saveEditEvt(){
        this.loading = true;
        const title =  this.template.querySelector(".evt-edit-title").value;
        const Start =  new Date(this.template.querySelector(".evt-edit-startdate").value);
        const End =  new Date(this.template.querySelector(".evt-edit-enddate").value);
        const status = this.template.querySelector(".evt-edit-status").value;
        updateEvt({evtId:this.editEventRecord.Id,evtStatus:status,evtStart:Start,evtEnd:End,evtName:title})
        .then(result=>{
            this.showToast('Success','Changes saved successfully','success');
            this.editEventModal = false;
            this.refresh();
        })
        .catch(error=>{
            this.showToast('Error',error.body.message,'error');
        })
        .finally(()=>{
            this.loading = false;
        })
    }
}
