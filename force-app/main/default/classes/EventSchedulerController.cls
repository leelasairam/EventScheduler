public class EventSchedulerController {
	@AuraEnabled
    public static String createEvent(datetime startDate, datetime endDate,string eventName){
        list<Schedule_Event__c>evtToInsert = new list<Schedule_Event__c>();
        list<String>successRecIds = new list<String>();
        Schedule_Event__c evt = new Schedule_Event__c();
        evt.Event_Start_Date__c = startDate;
        evt.Event_End_Date__c = endDate;
        evt.Name = eventName;
        evtToInsert.add(evt);
        list<Database.SaveResult>results = Database.insert(evtToInsert, false);
        for(Database.SaveResult sr : results){
            if(!sr.isSuccess()){
                throw new AuraHandledException(sr.getErrors()[0].getStatusCode() + '#' + sr.getErrors()[0].getMessage());
            }
            else{
                successRecIds.add(sr.getId());
            }  
        }
        return successRecIds[0];
    }
    
    @AuraEnabled(cacheable=true)
    public static list<Schedule_Event__c>getEvents(String monthYear,String UId,String refreshId){
        return [SELECT Id,Name,Event_Start_Date__c, Event_End_Date__c, Start_Date__c, End_Date__c,Event_Month_Year__c,Event_Status__c ,Owner.Name FROM Schedule_Event__c WHERE OwnerId =:UId AND Event_Month_Year__c=:monthYear ORDER BY Event_Start_Date__c];
    }
    
    @AuraEnabled
    public static String updateEvt(Id evtId,String evtStatus,datetime evtStart, datetime evtEnd, String evtName){
       list<Schedule_Event__c>evtToUpdate = new list<Schedule_Event__c>();
       list<String>successRecIds = new list<String>();
        Schedule_Event__c evt = new Schedule_Event__c();
        evt.Id = evtId;
        evt.Event_Status__c = evtStatus;
        evt.Event_Start_Date__c = evtStart;
        evt.Event_End_Date__c = evtEnd;
        evt.Name = evtName;
        evtToUpdate.add(evt);
        list<Database.SaveResult>results = Database.update(evtToUpdate, false);
        for(Database.SaveResult sr : results){
            if(!sr.isSuccess()){
                throw new AuraHandledException(sr.getErrors()[0].getStatusCode() + '#' + sr.getErrors()[0].getMessage());
            }
            else{
                successRecIds.add(sr.getId());
            }  
        }
        return successRecIds[0];
    }
}