public class EventSchedulerController {
	@AuraEnabled
    public static String createEvent(datetime startDate, datetime endDate,string eventName,String Owner,String caseId,String caseNumber,Boolean isAdditionalRes){
        /*if(caseId!=null && caseId!=''){
            Case currentCase = [SELECT Id,Assigned_To__c,Assigned_To__r.Name FROM Case WHERE Id = :caseId Limit 1];
            if(currentCase.Assigned_To__c != null){
                throw new AuraHandledException('This case was already assigned to '+ currentCase.Assigned_To__r.Name + '. Please cancel existing one first.');
            }
        }*/
        if(isDatesOverridden(startDate,endDate,Owner,null)){
            throw new AuraHandledException('Timings overlaping. Please choose different timings.');
        }
        list<Schedule_Event__c>evtToInsert = new list<Schedule_Event__c>();
        list<String>successRecIds = new list<String>();
        map<String,String>caseOwnerMap = new map<String,String>();
        list<Case>casesToUpdate = new list<Case>();
        Schedule_Event__c evt = new Schedule_Event__c();
        evt.Event_Start_Date__c = startDate;
        evt.Event_End_Date__c = endDate;
        evt.Name = caseNumber == null ? eventName : caseNumber+'-'+eventName;
        evt.OwnerId = Owner;
        evt.Case__c = caseId;
        evt.Additional_Resource__c = isAdditionalRes;
        evtToInsert.add(evt);
        for(Schedule_Event__c e : evtToInsert){
            //system.debug(e.Case__c + '#$' + e.OwnerId);
            if(e.Case__c!=null && e.Additional_Resource__c == false){
                caseOwnerMap.put(e.Case__c,e.OwnerId);
            }
        }
        list<Database.SaveResult>results = Database.insert(evtToInsert, false);
        for(Database.SaveResult sr : results){
            if(!sr.isSuccess()){
                throw new AuraHandledException(sr.getErrors()[0].getStatusCode() + '#' + sr.getErrors()[0].getMessage());
            }
            else{
                successRecIds.add(sr.getId());
            }  
        }
        
        for(String csId : caseOwnerMap.keySet()){
            Case cs = new Case();
            cs.Id = csId;
            cs.Assigned_To__c = caseOwnerMap.get(csId);
            casesToUpdate.add(cs);
        }
        
        if(!casesToUpdate.isEmpty()){
            try{
                update casesToUpdate;
            }
            catch(Exception e){
                throw new AuraHandledException(e.getMessage());
            }
        }
        return successRecIds[0];
    }
    
    @AuraEnabled(cacheable=true)
    public static list<Schedule_Event__c>getEvents(String monthYear,String UId,String refreshId){
        return [SELECT Id,Name,Event_Start_Date__c, Event_End_Date__c, Start_Date__c, End_Date__c,Event_Month_Year__c,Event_Status__c ,Case__c,Case__r.CaseNumber,Owner.Name FROM Schedule_Event__c WHERE OwnerId =:UId AND Event_Month_Year__c=:monthYear ORDER BY Event_Start_Date__c];
    }
    
    @AuraEnabled
    public static String updateEvt(Id evtId,String evtStatus,datetime evtStart, datetime evtEnd, String evtName,String caseId,String Owner){
        if(isDatesOverridden(evtStart,evtEnd,Owner,evtId)){
           throw new AuraHandledException('Timings overlaping. Please choose different timings.');
       }
       list<String>caseIdList = new list<String>();
       list<Case>casesToUpdate = new list<Case>();
       list<Schedule_Event__c>evtToUpdate = new list<Schedule_Event__c>();
       list<String>successRecIds = new list<String>();
        Schedule_Event__c evt = new Schedule_Event__c();
        evt.Id = evtId;
        evt.Event_Status__c = evtStatus;
        evt.Event_Start_Date__c = evtStart;
        evt.Event_End_Date__c = evtEnd;
        evt.Name = evtStatus != 'Cancelled' ? evtName : 'Cancelled-'+evtName;
        evt.Additional_Resource__c =  evtStatus == 'Cancelled' ? true : false;
        if(caseId!=null){
            evt.Case__c = caseId;
        }
        evtToUpdate.add(evt);
        
        for(Schedule_Event__c e : evtToUpdate){
            if(e.Event_Status__c == 'Cancelled' && e?.Case__c!=null && e.Additional_Resource__c == false){
                caseIdList.add(e.Case__c);
            }
        }
        
        list<Database.SaveResult>results = Database.update(evtToUpdate, false);
        for(Database.SaveResult sr : results){
            if(!sr.isSuccess()){
                throw new AuraHandledException(sr.getErrors()[0].getStatusCode() + '#' + sr.getErrors()[0].getMessage());
            }
            else{
                successRecIds.add(sr.getId());
            }  
        }
        
        for(String csId : caseIdList){
            Case cs = new Case();
            cs.Id = csId;
            cs.Assigned_To__c = null;
            casesToUpdate.add(cs);
        }
        
        if(!casesToUpdate.isEmpty()){
            try{
                update casesToUpdate;
            }
            catch(Exception e){
				throw new AuraHandledException(e.getMessage());                
            }
        }
        return successRecIds[0];
    }
    
    @AuraEnabled(cacheable=true)
    public static User getCalenderUser(String uid){
        return [SELECT Id,Name FROM User WHERE Id =: uid LIMIT 1];
    }
    
    @AuraEnabled
    public static map<String,Object> getCaseDetails(String CaseId){
        map<String,Object>returnMap = new map<String,Object>();
        Case cs = [SELECT Id,CaseNumber FROM Case WHERE Id =: CaseId LIMIT 1];
        list<Schedule_Event__c>caseEvents = [SELECT Id,Name,Event_Status__c,Owner.Name FROM Schedule_Event__c WHERE Case__c = :CaseId AND Additional_Resource__c = false AND Event_Status__c != 'Cancelled'];
        returnMap.put('caseDetails',cs);
        returnMap.put('isCaseAssigned',!caseEvents.isEmpty() ? true : false);
        returnMap.put('caseEvents',caseEvents);
        return returnMap;
    }
    
    public static Boolean isDatesOverridden(datetime startDateTime, datetime endDateTime, String Owner,String EventId){
        Boolean isOverridden = false;
        Boolean isInsert = EventId == null;
        Date startDate = startDateTime.date();
        Date endDate = endDateTime.date();
        list<Schedule_Event__c>evts = [SELECT Id,Name,Event_Start_Date__c, Event_End_Date__c, Start_Date__c, End_Date__c,Event_Month_Year__c,Event_Status__c ,Case__c,Case__r.CaseNumber,Owner.Name FROM Schedule_Event__c WHERE OwnerId =:Owner AND DAY_ONLY(Event_Start_Date__c) >= :startDate AND DAY_ONLY(Event_End_Date__c) <= :endDate AND Event_Status__c != 'Cancelled'];
        for(Schedule_Event__c evt : evts){
            if (startDateTime < evt.Event_End_Date__c && endDateTime > evt.Event_Start_Date__c && isInsert) {
            	isOverridden = true;
        	}
            else if (startDateTime < evt.Event_End_Date__c && endDateTime > evt.Event_Start_Date__c && !isInsert) {
                if(EventId!=evt.Id){
                    isOverridden = true;
                }
        	}
        }
        return isOverridden;
    }
    
    @AuraEnabled
    public static void cancelEvent(Id evtId){
        Schedule_Event__c evt = new Schedule_Event__c();
        evt.Id = evtId;
        evt.Event_Status__c = 'Cancelled';
        update evt;
    }
}