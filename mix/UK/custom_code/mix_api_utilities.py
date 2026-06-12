import pandas as pd
import requests
import json
import base64
from requests.utils import quote
import time
import datetime
import pandas as pd
import numpy as np
from pathlib import Path, PurePath
import re


def get_creds():
    p = Path.home().joinpath('custom_code/accounts.json')
    fp = open(p)
    res = json.load(fp)
    return res

#bearer_token = {'ApiUrl':get_creds()['mix_za']['ApiUrl']}
bearer_token = {}
#bearer_token['BearerToken'] =  'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjdpNXRielA2YnU5VXhjR0F5MGhPVWZIX3M4SSIsImtpZCI6IjdpNXRielA2YnU5VXhjR0F5MGhPVWZIX3M4SSJ9.eyJpc3MiOiJodHRwczovL2lkZW50aXR5LnphLm1peHRlbGVtYXRpY3MuY29tL2NvcmUiLCJhdWQiOiJodHRwczovL2lkZW50aXR5LnphLm1peHRlbGVtYXRpY3MuY29tL2NvcmUvcmVzb3VyY2VzIiwiZXhwIjoxNjk1NTY2NTkzLCJuYmYiOjE2OTU1NjI5OTMsImNsaWVudF9pZCI6ImludGVncmF0ZS56YS5lYSIsInNjb3BlIjpbIk1pWC5JbnRlZ3JhdGUiLCJvZmZsaW5lX2FjY2VzcyJdLCJzdWIiOiI0MDcxOTQyOTczNjA0MzY4OTI2IiwiYXV0aF90aW1lIjoxNjk1NTYyOTkzLCJpZHAiOiJpZHNydiIsIkVtYWlsIjoiYmlkYWxpQGNvbnRyb2x0ZWNoLWVhLmNvbSIsIkZ1bGxOYW1lIjoiUGV0ZXIgQmlkYWxpIiwiQWNjb3VudElkIjoiNDA3MTk0Mjk3MzYwNDM2ODkyNiIsIlVzZXJOYW1lIjoiYmlkYWxpQGNvbnRyb2x0ZWNoLWVhLmNvbSIsIk9yZ2FuaXNhdGlvbkdyb3VwSWQiOiIxIiwiVGhyb3R0bGluZ1NpemUiOiJTbWFsbCIsIkF1dGhQcm92aWRlciI6Ik1pWC5BdXRoZW50aWNhdGlvbi5JZGVudGl0eSIsIkF1dGhUb2tlbiI6IjAxZmNkZDlhLTBhY2MtNGZhYi1iODBkLWMxZWFiYzJhZDczYyIsImp0aSI6IjMyNDMxYmJlNDJjOTczN2NiYjIxYjZhMGFjMjZkOTk3IiwiYW1yIjpbInBhc3N3b3JkIl19.g5DMtD50zpRuYMXObdbe0DCCMls_CeUKJJUDCQa6vFaJMztabfTqJ0R1yoYFr40i0EbXvSXnMKw8ubphn7oeDVqyPkdG0tcon4AOA1s3MAsLsTwXlUxruZX_MyrQ7ikZhbNm_qhxOwGhrpuS58szK0Xm7eZ3JEBprRbDzZrrzrFyZV2XnYiacHABMRIPQGBozv9xQ8OcEkRt_uaP3I4wu1sY7q29JIMXq4EEkHdP3QqFojTvF4JR8vQnhAdvv3lPHgkmNnW336YlaFMa68-jWlrZAtCmOsLm6f4_oDbXdN29HX3FICMbzOHcK0SHOGF7KSSXh32DYIEhd1F3A53LRu12YQ5VpZkqeksD3Bq3n0YUTU2w82k1FdyS7KZzuqX1myKfauzPtNrr2yVG2zbn_3Pre54HBSU1rS7TMzDvwm_XoCf2Xk_4cxxQRK-QtqrQWcC-Rk1rcPRcwIdCs6HwQ0mQPtXEZjKGqLv8DBSVVsPtbOnchItIb-NjmZq_Zr52BSzztpzDSa28OvvfBE2z2iNPt8UPVgt-izoWmQbFVWRnnadA6_PI00FJVJcBHcgaXn0SuvlHPhzyLjkUvB_YtfJTAmNv6abP4CZUQhkWprzXTQJ48W0wTzEPGzW5BOuUP9yw1xCxLD_jXeEAs98Y0cEo7jlec5MQT2UCoZziYGk'
def get_bearer(server=None, bearer_token=bearer_token):
    if server is None:
        server = 'mix_' + bearer_token['ApiUrl'].split('.')[1]
    print('BearerToken:', bearer_token)
    creds = get_creds()[server]
    IdentityUrl = creds['IdentityUrl']
    ApiUrl = creds['ApiUrl']
    bearer_token['ApiUrl'] = ApiUrl
    IdentityClientId = creds["IdentityClientId"]
    IdentityClientSecret = creds["IdentityClientSecret"]
    IdentityUsername = creds["IdentityUsername"]
    IdentityPassword = creds["IdentityPassword"]
    IdentityScope = creds["IdentityScope" ]

    #print("1. Get Identity server configuration")
    ConfigUrl = IdentityUrl + "/core/.well-known/openid-configuration"
    #print("Request: " + ConfigUrl)
    ConfigResponse = requests.get(ConfigUrl)
    print(ConfigResponse.status_code, ConfigResponse.reason)
    IdServerConfig = json.loads(ConfigResponse.content)
    #print("Config.issuer: " + IdServerConfig["issuer"])
    #print("Config.token_endpoint: " + IdServerConfig["token_endpoint"])
    IdTokenEndPoint = IdServerConfig["token_endpoint"]

    #print("2. Authenticate against Identity server")
    auth = "Basic " + base64.b64encode(bytes(IdentityClientId + ":" + IdentityClientSecret, "utf-8")).decode('ascii')
    body = "grant_type=password&username=" + quote(IdentityUsername) + "&password=" + quote(IdentityPassword) + "&scope=" + IdentityScope
    #print("Authorization: " + auth)
    #print("Body: " + body)
    #print("Request: " + IdTokenEndPoint)
    TokenResponse = requests.post(IdTokenEndPoint, data = body, headers = {"accept":"application/json", "Authorization":auth })
    #print(TokenResponse.status_code, TokenResponse.reason)
    Token = json.loads(TokenResponse.content)
    print("expires_in: " + str(Token["expires_in"]))
    #print("refresh_token: " + Token["refresh_token"])
    #print("token_type: " + Token["token_type"])
    #print("access_token: " + str(len(Token["access_token"])) + " bytes")
    BearerToken = "Bearer " + Token["access_token"]
    bearer_token['BearerToken'] = BearerToken
    return bearer_token


def add_A(cell):
    cell = str(cell)
    if not cell.startswith('A'):
        cell = f'A{cell}'
    return cell

def remove_A(cell):
    cell = str(cell)
    if cell.startswith('A'):
        cell = cell.replace('A', '')
    return cell

def id_to_string(frame):
    'convert all columns that end in "Id" to string type inplace'
    cols_ = frame.columns.str.endswith('Id')
    cols = frame.columns[cols_]
    res_frame = frame[cols].astype(str).applymap(add_A)#add letter A to force it to be string
    frame[cols] = res_frame
def string_to_id(frame):
    cols_ = frame.columns.str.endswith('Id')
    cols = frame.columns[cols_]
    #print('XXX', cols)
    frame[cols] = frame[cols].applymap(lambda x: int(x.replace('A', '')))
def get_group_assets(group_id):
    GetAssetsForGroupUrl = bearer_token['ApiUrl'] + "/api/assets/group/" + str(group_id)
    #print('get_group_assets ApiUrl:', bearer_token['ApiUrl'])
    AssetsResponse = requests.get(GetAssetsForGroupUrl, headers = {"accept":"application/json", "Authorization":bearer_token['BearerToken'] })

    if AssetsResponse.status_code == 429:#too many request
        time.sleep(61)
        AssetsResponse = requests.get(GetAssetsForGroupUrl, headers = {"accept":"application/json", "Authorization":bearer_token['BearerToken'] })
    if AssetsResponse.status_code != 200:
        print("Error (get_group_assets):", AssetsResponse.status_code, AssetsResponse.reason, group_id)
        print(GetAssetsForGroupUrl)
        return {}
    Assets = json.loads(AssetsResponse.content)
    return Assets
def get_group_drivers(group_id):
    GetDriversForGroupUrl = bearer_token['ApiUrl'] + "/api/drivers/group/" + str(group_id)
    DriversResponse = requests.get(GetDriversForGroupUrl, headers = {"accept":"application/json", "Authorization":bearer_token['BearerToken'] })
    if DriversResponse.status_code == 429:#too many request
        time.sleep(61)
        DriversResponse = requests.get(GetDriversForGroupUrl, headers = {"accept":"application/json", "Authorization":bearer_token['BearerToken'] })

    if DriversResponse.status_code != 200:
        print("Error (get_group_drivers):", DriversResponse.status_code, DriversResponse.reason)
        return {}
    Drivers = json.loads(DriversResponse.content)
    return Drivers

def get_all_groups():
    GetGroupsUrl = bearer_token['ApiUrl'] + "/api/organisationgroups"
    GroupsResponse = requests.get(GetGroupsUrl, headers = {"accept":"application/json", "Authorization":bearer_token['BearerToken'] })
    Groups = json.loads(GroupsResponse.content)
    Groups_df = pd.DataFrame(Groups).astype(str)
    #id_to_string(Groups_df)
    return Groups_df
def get_group_subgroups(group_id):
    GetSubGroupsForGroupUrl = bearer_token['ApiUrl'] + "/api/organisationgroups/subgroups/" + str(group_id)
    SubGroupsResponse = requests.get(GetSubGroupsForGroupUrl, headers = {"accept":"application/json", "Authorization":bearer_token['BearerToken'] })
    sleep = 61#sleep to stop the 429 error
    if (SubGroupsResponse.status_code == 429):#too many requests
        time.sleep(sleep)
        SubGroupsResponse = requests.get(GetSubGroupsForGroupUrl, headers = {"accept":"application/json", "Authorization":bearer_token['BearerToken'] })
    if SubGroupsResponse.status_code != 200:
        print("Error (get_group_subgroups):", SubGroupsResponse.status_code, SubGroupsResponse.reason)
        return None
    SubGroups = json.loads(SubGroupsResponse.content)
    return SubGroups
def get_all_subgroups():
    groups = get_all_groups()
    groups = groups[groups.Name !='LafargeHolcim - Uganda'].copy()
    res = []
    for idx, group in groups.iterrows():
        print('Getting subgroups for', group.Name)
        group_subgroups = get_group_subgroups(group.GroupId)
        if not group_subgroups:
            res.append(['', group.GroupId, group.Name, group.Type, 0])
            continue
        res.append(['', '',#parentGroupId, parentGroupName
                    group_subgroups['GroupId'], group_subgroups['Name'], group_subgroups['Type'],
                    len(group_subgroups['SubGroups'])])
        subgroups = group_subgroups['SubGroups']
        for subgroup in subgroups:
            res.append([group_subgroups['GroupId'], group_subgroups['Name'],#parentGroupId, parentGroupName
                    subgroup['GroupId'], subgroup['Name'], subgroup['Type'],
                    len(subgroup['SubGroups'])])
    res = pd.DataFrame(res, columns=['parentGroupId', 'parentGroupName', 'GroupId', 'Name', 'Type', 'n_subgroups'])
    #id_to_string(res)
    res['process_org'] = 0#for use when we want to report
    res['report_name'] = ''#write site names to generate report at site level. same name for multiple sites means the sites are treated as one transporter
    return res
def get_library_events(org_id):
    OrgLibEventsUrl = bearer_token['ApiUrl'] + f"/api/libraryevents/organisation/{org_id}"
    OrgLibEventsResponse = requests.get(OrgLibEventsUrl, headers = {"accept":"application/json", "Authorization":bearer_token['BearerToken'] })
    if (OrgLibEventsResponse.status_code == 429):#too many requests
        print('Too many requests (get_library_events)')
        time.sleep(61)
        OrgLibEventsResponse = requests.get(OrgLibEventsUrl, headers = {"accept":"application/json", "Authorization":bearer_token['BearerToken'] })
    #print(OrgLibEventsResponse.status_code, OrgLibEventsResponse.reason)
    OrgLibEvents = json.loads(OrgLibEventsResponse.content)
    return OrgLibEvents
def get_all_library_events():
    all_groups = get_all_groups()
    all_groups = all_groups[all_groups.Name !='LafargeHolcim - Uganda'].copy()
    res = []
    for idx, group in all_groups.iterrows():
        GroupId = group.GroupId
        library_events = get_library_events(GroupId)
        #print('Getting LibEvents:', group.Name, library_events)
        sub_df = pd.DataFrame(library_events)
        #sub_df["Description", "EventTypeId", "EventType", "DisplayUnits", "FormatType", "ValueName"]
        sub_df['GroupId'] = GroupId
        sub_df['GroupName'] = group.Name
        sub_df['GroupType'] = group.Type
        sub_df['DisplayTimeZone'] = group.DisplayTimeZone
        sub_df['EventRename'] = sub_df.Description.copy()
        res.append(sub_df)
    res = pd.concat(res).copy()
    res['process'] = 0#for use when we want to report
    #id_to_string(res)
    return res

def get_group_events(org_df, org_lib_events, t1, t2, entityType='Asset', freq='1d'):
    '''org_df is the organization or group df.
       org_lib_events is list of ids.
       t1 and t2 are start and stop times as pd.datetimes format
       entityType = {'Asset', 'Driver'}
       freq is the frequence for getting the data. Max 7d'''
    d_format = '%Y%m%d%H%M%S'
    group_ids = [int(i) for i in org_df.GroupId.to_list()]
    event_ids = [int(i) for i in org_lib_events.EventTypeId.to_list()]

    t1, t2 = pd.to_datetime([t1, t2], format=d_format)
    date_range = pd.date_range(start=t1, end=t2, freq=freq).to_list()
    if date_range[-1] < t2:#
        date_range.append(t2)
    FROM = date_range[:-1]
    TO   = [t - pd.to_timedelta('1s') for t in date_range[1:]]#deduct one second from the TO
    res = []
    print(f'\tGetting events from: {FROM[0]}\tto: {TO[-1]}')
    for FROM_, TO_ in zip(FROM, TO):
        FROM_, TO_ = FROM_.strftime('%Y%m%d%H%M%S'), TO_.strftime('%Y%m%d%H%M%S')
        print(f'\t\tEvents:From: {FROM_}\tTo: {TO_}')
        GetGroupsEventsUrl = bearer_token['ApiUrl'] + f"/api/events/groups/entitytype/{entityType}/from/{FROM_}/to/{TO_}"
        eventFilter = {
            "EntityIds": group_ids,
            "EventTypeIds":event_ids
            #"MenuId": "string"
            }
        #eventFilter = json.dumps(eventFilter, separator=(',', ':'))
        GroupsEventsResponse = requests.post(GetGroupsEventsUrl, headers = {"accept":"application/json", "Authorization":bearer_token['BearerToken'] },
                                           json=eventFilter)
        if (GroupsEventsResponse.status_code == 429):#too many requests
            time.sleep(61)
            GroupsEventsResponse = requests.post(GetGroupsEventsUrl, headers = {"accept":"application/json", "Authorization":bearer_token['BearerToken'] },
                                                json=eventFilter)
        if GroupsEventsResponse.status_code == 204:#No Content, so we continue.
            continue
        if GroupsEventsResponse.status_code != 200:
            print("Error (get_group_events):", GroupsEventsResponse.status_code, GroupsEventsResponse.reason)
            print("Error (get_group_events):", FROM_, TO_, eventFilter)
            return None
        GroupsEvents = json.loads(GroupsEventsResponse.content)
        res.extend(GroupsEvents)
    res = pd.DataFrame(res)
    res['Distance (KM)'] = 0.0
    if 'StartOdometerKilometres' in res.columns:
        res['Distance (KM)'] = res.EndOdometerKilometres - res.StartOdometerKilometres
    res.rename(columns={'StartDateTime':'Beginning', 'EndDateTime':'End', 'TotalOccurances':'Count'}, inplace=True)
    #id_to_string(res)
    return res

def get_group_trips(org_df, t1, t2, entityType='Asset', freq='1d'):
    '''org_df is the organization or group df.
       t1 and t2 are start and stop times as pd.datetimes format
       entityType = {'Asset', 'Driver'}
       freq is the frequence for getting the data. Max 7d'''
    d_format = '%Y%m%d%H%M%S'
    group_ids = [int(i) for i in org_df.GroupId.to_list()]
    t1, t2 = pd.to_datetime([t1, t2], format=d_format)
    date_range = pd.date_range(start=t1, end=t2, freq=freq).to_list()
    if date_range[-1] < t2:#
        date_range.append(t2)
    FROM = date_range[:-1]
    TO   = [t - pd.to_timedelta('1s') for t in date_range[1:]]
    res = []
    print(f'\tGetting trips from: {FROM[0]}\tto: {TO[-1]}')
    for FROM_, TO_ in zip(FROM, TO):
        FROM_, TO_ = FROM_.strftime('%Y%m%d%H%M%S'), TO_.strftime('%Y%m%d%H%M%S')
        print(f'\t\tTrips:From: {FROM_}\tTo: {TO_}')
        GetGroupsTripsUrl = bearer_token['ApiUrl'] + f"/api/trips/groups/from/{FROM_}/to/{TO_}/entitytype/{entityType}"
        GroupsTripsResponse = requests.post(GetGroupsTripsUrl, headers = {"accept":"application/json", "Authorization":bearer_token['BearerToken'] },
                                           json=group_ids)
        while (GroupsTripsResponse.status_code == 429):#too many requests
            time.sleep(61)
            GroupsTripsResponse = requests.post(GetGroupsTripsUrl, headers = {"accept":"application/json", "Authorization":bearer_token['BearerToken'] },
                                              json=group_ids)
        if GroupsTripsResponse.status_code == 204:#No Content, so we continue.
            continue
        if GroupsTripsResponse.status_code != 200:
            print("Error (get_group_trips):", GroupsTripsResponse.status_code, GroupsTripsResponse.reason)
            return None
        GroupsTrips = json.loads(GroupsTripsResponse.content)
        res.extend(GroupsTrips)
    res = pd.DataFrame(res)
    res.rename(columns={'DistanceKilometers':'Distance (KM)', 'TripStart':'Beginning', 'TripEnd':'End',
                       'FuelUsedLitres':'Fuel Used (Litres)'}, inplace=True)
    #id_to_string(res)
    return res
def request_post_data(url, headers, json_obj):
    Response = requests.post(url, headers=headers, json=json_obj)
    if Response.status_code == 401:
        get_bearer(bearer_token=bearer_token)#get new bearer
        headers["Authorization"] = bearer_token['BearerToken']
        Response = requests.post(url, headers=headers, json=json_obj)
    if Response.status_code == 429:#too many request
        time.sleep(61)
        Response = requests.post(url, headers=headers, json=json_obj)
    if Response.status_code == 204:
        print('No content (request_post_data)', url)
        return pd.DataFrame()
    if Response.status_code != 200:
        print('Error (request_post_data)', url, Response.status_code, Response.reason)
        return None
    ResponseData = json.loads(Response.content)
    return pd.DataFrame(ResponseData)

def get_assets_events(assets_ids, events_ids, FROM_DATE, TO_DATE):
    EventFilter = {"EntityIds": [int(i) for i in assets_ids], "EventTypeIds": [int(i) for i in events_ids]}#, "MenuId": "string"}
    date_offset = pd.DateOffset(hours=3)
    FROM_DATE, TO_DATE = FROM_DATE - date_offset, TO_DATE - date_offset
    FROM_DATE, TO_DATE = FROM_DATE.strftime('%Y%m%d%H%M%S'), TO_DATE.strftime('%Y%m%d%H%M%S')
    GetAssetsEventsUrl = bearer_token['ApiUrl'] + f"/api/events/assets/from/{FROM_DATE}/to/{TO_DATE}"
    assets_events = request_post_data(GetAssetsEventsUrl, headers = {"accept":"application/json", "Authorization":bearer_token['BearerToken'] }, json_obj=EventFilter)
    return assets_events

def get_assets_trips(assets_ids, FROM_DATE, TO_DATE):
    assets_ids = [int(i) for i in assets_ids]
    date_offset = pd.DateOffset(hours=3)
    FROM_DATE, TO_DATE = FROM_DATE - date_offset, TO_DATE - date_offset
    FROM_DATE, TO_DATE = FROM_DATE.strftime('%Y%m%d%H%M%S'), TO_DATE.strftime('%Y%m%d%H%M%S')
    GetAssetsTripsUrl = bearer_token['ApiUrl'] + f"/api/trips/assets/from/{FROM_DATE}/to/{TO_DATE}"
    assets_trips = request_post_data(GetAssetsTripsUrl, headers = {"accept":"application/json", "Authorization":bearer_token['BearerToken'] }, json_obj=assets_ids)
    return assets_trips



def chunker(seq, size):#for splitting assets into chunks
    return (seq[pos:pos + size] for pos in range(0, len(seq), size))


def write_summary(writer, time_df, group_df, lib_events_df, assets_df, drivers_df=None):
    'write each dataframe in own sheet'
    time_df.to_excel(writer, sheet_name='Time', engine='openpyxl')
    group_df = group_df.copy()
    id_to_string(group_df)
    group_df[['parentGroupId', 'parentGroupName', 'GroupId', 'Name', 'Type', 'process_org', 'report_name']].to_excel(writer, sheet_name='Sites', index=False, engine='openpyxl')
    lib_events_df = lib_events_df.copy()
    id_to_string(lib_events_df)
    if 'EventRename' not in lib_events_df.columns:
        lib_events_df['EventRename'] = lib_events_df['Event'].copy()
    lib_events_df[['EventTypeId', 'EventType', 'Event', 'EventRename', 'EventType']].to_excel(writer, sheet_name='LibEvents', index=False, engine='openpyxl')
    assets_df = assets_df.copy()
    id_to_string(assets_df)
    assets_df[['SiteId', 'AssetId', 'RegistrationNumber', 'Description']].to_excel(writer, sheet_name='Assets', index=False, engine='openpyxl')
    driver_cols = ['SiteId', 'DriverId', 'Name']
    if type(drivers_df) == type(None):
        drivers_df = pd.DataFrame(columns=driver_cols)
    drivers_df = drivers_df.copy()
    #print('Drivers:', drivers_df.shape[0])
    id_to_string(drivers_df)
    drivers_df[driver_cols].to_excel(writer, sheet_name='Drivers', index=False, engine='openpyxl')


def get_trips_and_events(path, assets_df, drivers_df, freq='1d', assets_n_chunks=None, to_get_events=True, to_get_trips=True):#path is file containing report dates, subgroups and libevents
    time_df = pd.read_excel(path, sheet_name='Time', index_col='Name')
    FROM, TO = pd.to_datetime(time_df)
    date_range = pd.date_range(start=FROM, end=TO, freq=freq).to_list()
    if date_range[-1] < TO:#
        date_range.append(TO)
    FROM_LIST = date_range[:-1]
    TO_LIST   = [t - pd.to_timedelta('1s') for t in date_range[1:]]

    lib_events_df = pd.read_excel(path, sheet_name='LibEvents', dtype={'EventTypeId':'object', 'GroupId':'object'})
    string_to_id(lib_events_df)
    lib_events_df.rename(columns={'Description':'Event'}, inplace=True)
    lib_events_df = lib_events_df[lib_events_df.process==1].copy()#only the events with a value of 1
    sub_groups = pd.read_excel(path, sheet_name='SubGroups', dtype={'parentGroupId':'object', 'GroupId':'object'})
    sub_groups = sub_groups[sub_groups.parentGroupName.notna()].copy()
    #return sub_groups
    string_to_id(sub_groups)
    organization_groups = sub_groups.groupby('parentGroupId')
    for org_id, org_df in organization_groups:
        report_lib_events_df = lib_events_df[lib_events_df.GroupId==org_id]
        org_df2 = org_df[org_df.report_name.notna()]
        report_groups = org_df2.groupby('report_name')
        for report_name, report_group in report_groups:
            print('Pulling data for:', report_name)
            report_path = Path(report_name)
            report_path.mkdir(exist_ok=True)
            details_writer = pd.ExcelWriter(f'{report_path}/report_details.xlsx')
            #write_summary(details_writer, time_df, org_df.sort_values(by='Name'), report_lib_events_df)
            #write_summmary2(writer, time_df, group_df, lib_events_df, assets_df, drivers_df)

            #assets = get_report_assets(details_writer, report_group)
            assets = assets_df[['SiteId', 'AssetId', 'RegistrationNumber', 'Description', 'report_name']]
            assets = assets[assets.report_name==report_name].copy()
            #print(assets.shape)
            if assets.shape[0] == 0:#no assets
                print(f'Skipping {report_name}: No assets')
                continue
            asset_ids_list = assets.AssetId.to_list()
            asset_ids_list = [a.replace('A', '') for a in asset_ids_list]
            #print(asset_ids_list)
            if not assets_n_chunks:
                assets_n_chunks = len(asset_ids_list)
            #assets_chunks = chunker(asset_ids_list, assets_n_chunks)

            #drivers = get_report_drivers(details_writer, report_group)
            drivers = drivers_df[['SiteId', 'DriverId', 'Name', 'report_name']]
            drivers = drivers[(drivers.report_name==report_name)]# & (drivers.SiteId.isin(report_group.GroupId.unique() ))].copy()
            #print('Drivers 1', drivers.shape)
            write_summary(details_writer, time_df, report_group.sort_values(by='Name'), report_lib_events_df, assets, drivers)
            #details_writer.save()
            details_writer.close()
            #continue
            events_dir = report_path.joinpath('Events')
            events_dir.mkdir(exist_ok=True)
            trips_dir  = report_path.joinpath('Trips')
            trips_dir.mkdir(exist_ok=True)
            for FROM_DATE, TO_DATE in zip(FROM_LIST, TO_LIST):
                FROM_DATE_STR = FROM_DATE.strftime('%Y_%m_%d')
                print('\t', FROM_DATE_STR)
                events_data_path = events_dir.joinpath(FROM_DATE_STR +'.xlsx')
                trips_data_path  = trips_dir.joinpath(FROM_DATE_STR +'.xlsx')
                if  not events_data_path.exists() and to_get_events:
                    events_date_res = []
                    assets_chunks = chunker(asset_ids_list, assets_n_chunks)
                    for assets_chunk in assets_chunks:
                        date_report_events = get_assets_events(assets_chunk, report_lib_events_df.EventTypeId.to_list(), FROM_DATE, TO_DATE)
                        events_date_res.append(date_report_events)
                    #print(assets_chunk)
                    events_date_df = pd.concat(events_date_res)
                    id_to_string(events_date_df)
                    events_date_df.to_excel(events_data_path)
                if not trips_data_path.exists() and to_get_trips:
                    trips_date_res =  []
                    assets_chunks = chunker(asset_ids_list, assets_n_chunks)
                    for assets_chunk in assets_chunks:
                        date_report_trips = get_assets_trips(assets_chunk, FROM_DATE, TO_DATE)
                        trips_date_res.append(date_report_trips)
                    trips_date_df = pd.concat(trips_date_res)
                    id_to_string(trips_date_df)
                    trips_date_df.to_excel(trips_data_path)



#for transformation
def read_daily_trips_file(path):
    trip_day = pd.to_datetime(path.parts[-1], format='%Y_%m_%d.xlsx')
    df = pd.read_excel(path)
    df['trip_day'] = trip_day
    #print(path)
    df['ReportName'] = path.parts[-3]
    if 'Duration' in df.columns:
        df['Duration'] = df['Duration']/3600#convert to hours
    else:
        df['Duration'] = 0.0
    return df

def read_mix_api_trips(daily_trips_directory):
    daily_trips_directory = Path(daily_trips_directory)
    print(daily_trips_directory)
    report_details_path = Path('\\'.join(daily_trips_directory.parts[:-1])).joinpath('report_details.xlsx')
    org_path = Path('\\'.join(daily_trips_directory.parts[:-1]))
    assets_df = read_mix_api_assets(org_path)
    drivers_df = read_mix_api_drivers(org_path)
    sites_df = read_mix_api_sites(org_path)

    df = pd.concat([read_daily_trips_file(daily_trips_file) for daily_trips_file in Path(daily_trips_directory).iterdir()])
    df['TripStart'] = pd.to_datetime(df.TripStart)
    df['TripEnd'] = pd.to_datetime(df.TripEnd)
    if 'FuelUsedLitres' not in df.columns:
        df['FuelUsedLitres'] = 0
    df.drop(columns=['StartPosition', 'EndPosition', 'EndEngineSeconds', 'StartEngineSeconds', 'LastHalt', 'FirstDepart',
                     'EndPositionId', 'StartPositionId', 'SubTrips', 'MaxAccelerationKilometersPerHourPerSecond',
                    'MaxDecelerationKilometersPerHourPerSecond', 'MaxRpm'], inplace=True, errors='ignore')
    df = df.merge(assets_df.drop(columns=['ReportName']), on='AssetId', how='outer')
    #return df
    df = df.merge(drivers_df[['DriverId', 'DriverName']], on='DriverId', how='outer')
    df = df.merge(sites_df[['parentGroupId', 'parentGroupName', 'GroupId', 'SiteName']].rename(columns={'GroupId':'SiteId'}), on='SiteId', how='outer')
    df[['DistanceKilometers', 'Duration', 'FuelUsedLitres']] = df[['DistanceKilometers', 'Duration', 'FuelUsedLitres']].fillna(0)
    return df

def read_mix_api_events(daily_events_directory):
    daily_events_directory = Path(daily_events_directory)
    report_details_path = Path('\\'.join(daily_events_directory.parts[:-1])).joinpath('report_details.xlsx')
    org_path = Path('\\'.join(daily_events_directory.parts[:-1]))
    assets_df = read_mix_api_assets(org_path)
    drivers_df = read_mix_api_drivers(org_path)
    sites_df = read_mix_api_sites(org_path)
    lib_events_df = read_mix_api_lib_events(org_path)

    df = pd.concat([pd.read_excel(daily_events_file) for daily_events_file in Path(daily_events_directory).iterdir()])

    #begin merges
    df = df.merge(assets_df.drop(columns=['ReportName']), on='AssetId', how='outer')
    df = df.merge(drivers_df[['DriverId', 'DriverName']], on='DriverId', how='outer')
    df = df.merge(sites_df[['parentGroupId', 'parentGroupName', 'GroupId', 'SiteName']].rename(columns={'GroupId':'SiteId'}), on='SiteId', how='outer')
    df = df.merge(lib_events_df[['EventTypeId', 'EventName']], on='EventTypeId', how='outer')

    df['StartDateTime'] = pd.to_datetime(df.StartDateTime)
    df['EndDateTime'] = pd.to_datetime(df.EndDateTime)
    df['ReportName'] = daily_events_directory.parts[-2]
    if len(df.columns.intersection(['EndOdometerKilometres', 'StartOdometerKilometres'])) != 2:
        df['DistanceKilometers'] = 0.0
    else:
        df['DistanceKilometers'] = df.EndOdometerKilometres - df.StartOdometerKilometres
    if 'TotalTimeSeconds' in df.columns:
        df['Duration'] = df.TotalTimeSeconds/3600
    else:
        df['Duration'] = 0.0
    fill_col = df[df.AssetId.notna()].iloc[0].copy()
    fill_col.update({'TotalOccurances':0, 'TotalTimeSeconds':0, 'DistanceKilometers':0, 'Duration':0})

    #df[['TotalOccurances', 'Duration', 'DistanceKilometers']] = df[['TotalOccurances', 'Duration', 'DistanceKilometers']].fillna(0)
    df.fillna(fill_col, inplace=True)

    df.drop(columns=['MediaUrls', 'StartPosition', 'EndPosition', 'Value', 'EventCategory'], inplace=True, errors='ignore')
    return df

def read_mix_api_assets(org_dir):
    df = pd.read_excel(org_dir.joinpath('report_details.xlsx'), sheet_name='Assets')
    df['ReportName'] = org_dir.name
    df.rename(columns={'Description':'AssetDescription'}, inplace=True)
    return df

def read_mix_api_drivers(org_dir):
    df = pd.read_excel(org_dir.joinpath('report_details.xlsx'), sheet_name='Drivers')
    df['ReportName'] = org_dir.name
    df.rename(columns={'Name':'DriverName'}, inplace=True)
    return df

def read_mix_api_lib_events(org_dir):
    df = pd.read_excel(org_dir.joinpath('report_details.xlsx'), sheet_name='LibEvents')
    df['ReportName'] = org_dir.name
    df.rename(columns={'Event':'EventName'}, inplace=True)
    return df

def read_mix_api_sites(org_dir):
    df = pd.read_excel(org_dir.joinpath('report_details.xlsx'), sheet_name='Sites')
    df['ReportName'] = org_dir.name
    id_to_string(df)
    df.rename(columns={'Name':'SiteName'}, inplace=True)
    return df


#bridge events
def write_bridge_events_df(events_df, report_name=None, out_file='bridge_violations.xlsx'):
    '''write the "['TotalOccurances', 'EventTypeId', 'parentGroupId', 'parentGroupName', 'EventName', 'EventRename']" summary for mapping to match events
    Rename the 'EventRename' column to rename the violation names, leave blank for those you want to ignore
    '''
    if report_name:
        out_file = f'Bridges/{report_name}/{out_file}'
    else:
        out_file = f'Bridges/{out_file}'
    out_file = Path(out_file)
    if out_file.exists():
        print('Skipping bridge write. File already exists at:', out_file)
        return
    print('Writing bridge at', out_file)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    if 'EventRename' not in events_df.columns:
        events_df['EventRename'] = events_df.EventName.copy()
    index_col = ['EventTypeId', 'parentGroupId', 'parentGroupName', 'EventName', 'EventRename']
    pvt_df = events_df.pivot_table(index=index_col, values='TotalOccurances', aggfunc=sum).reset_index()
    pvt_df.to_excel(out_file, index=False)

def read_bridge_events_df(events_df, report_name=None, in_file='bridge_violations.xlsx'):
    if report_name:
        in_file = f'Bridges/{report_name}/{in_file}'
    else:
        in_file = f'Bridges/{in_file}'
    df = pd.read_excel(in_file).drop(columns='TotalOccurances')
    #df.set_index(['Grouping', 'Violation'], inplace=True)
    events_df = events_df.drop(columns=['EventName', 'EventRename'], errors='ignore').merge(df, how='left', on=['EventTypeId', 'parentGroupId', 'parentGroupName'])
    events_df = events_df.drop(columns='EventName').rename(columns={'EventRename':'EventName'})
    events_df = events_df[events_df.EventName.notna()].copy()
    return events_df


def detect_col_types(events_df):
    events_df = events_df[events_df.EventName.notna()]
    distance_cols = []
    count_cols = []

    for event in events_df.EventName.unique():
        if 'free' in event.lower() or 'speed' in event.lower():
            distance_cols.append(event)
    for event in events_df.EventName.unique():
        if 'brak' in event.lower():
            count_cols.append(event)
    return (count_cols, distance_cols)

def make_rag_score(trips_df, events_df, entity_column_name=None,
        distance_col_name='DistanceKilometers', duration_col_name='Duration'):#entity_column_name can be 'AssetDescription' or 'DriverName'
    if not entity_column_name:
        entity_column_name = ['ReportName', 'AssetDescription', 'RegistrationNumber']
    trips_df = trips_df.copy()
    trips_df['DriverName'] = trips_df.DriverName.fillna('Unknown Driver')
    events_df['DriverName'] = events_df.DriverName.fillna('Unknown Driver')
    print()
    duration = trips_df.groupby(by=entity_column_name)[[duration_col_name]].sum()
    distance = trips_df.groupby(by=entity_column_name)[[distance_col_name]].sum()
    events_pvt = events_df.pivot_table(values='TotalOccurances', index=entity_column_name, columns='EventName', fill_value=0, aggfunc='sum')
    advanced_score = events_pvt.sum(axis=1)
    advanced_score.name = 'Advanced Score'

    final = pd.concat([distance, duration, advanced_score, events_pvt], axis=1)
    final.fillna(0, inplace=True)
    (count_cols, distance_cols) = detect_col_types(events_df)
    vehicle_dist = trips_df.groupby(entity_column_name)[distance_col_name].sum()
    final2 = final.copy()
    final2[' '] = ' '#add an empty column to separate advanced score columns from ratio colulmns
    #distance cols
    distance_ratios = events_df.pivot_table(values=distance_col_name, index=entity_column_name, columns='EventName', aggfunc='sum', fill_value=0)
    distance_ratios = distance_ratios[distance_cols].div(final[distance_col_name], axis=0) * 100
    distance_ratios.rename(columns=lambda n: f'{n} Distance (%)', inplace=True)
    final2 = pd.merge(final2, distance_ratios, how='outer', left_index=True, right_index=True)
    #merge with count cols
    count_ratios = events_df.pivot_table(values='TotalOccurances', index=entity_column_name, columns='EventName', aggfunc='sum', fill_value=0)
    count_ratios = count_ratios[count_cols].div(final[distance_col_name], axis=0) * 100
    count_ratios.rename(columns=lambda n: f'{n} (#/100 km)', inplace=True)
    final2 = pd.merge(final2, count_ratios, how='outer', left_index=True, right_index=True)

    final2.fillna(0, inplace=True)
    final2.sort_values(by='Advanced Score', inplace=True)
    final2.rename(columns={'DistanceKilometers':'Distance (KM)', 'Duration':'Duration (Hours)'}, inplace=True)
    final2[['Distance (KM)', 'Duration (Hours)']] = final2[['Distance (KM)', 'Duration (Hours)']].round(2)
    final2.index.name = 'Vehicle Description'
    final2 = final2[final2[['Distance (KM)', 'Duration (Hours)']].sum(axis=1)>0]#remove vehicles with zero distance or zero duration
    final2.reset_index(inplace=True)
    return final2


def make_daily_utilization(trips_df, FROM, TO):
    FROM, TO = pd.to_datetime([FROM, TO])
    all_dates = pd.date_range(FROM, TO, freq='1d')
    dummy_trips_data = pd.DataFrame([trips_df.iloc[0] for a in all_dates])
    dummy_trips_data['DistanceKilometers'] = 0
    dummy_trips_data['trip_day'] = all_dates
    trips2 = pd.concat([trips_df, dummy_trips_data]).copy()
    trips2.rename(columns={'DistanceKilometers':'Distance (KM)', 'AssetDescription':'Vehicle'}, inplace=True)
    trips2['day'] = trips2.trip_day.dt.day
    trips2['month'] = trips2.trip_day.dt.month
    trips2['year'] = trips2.trip_day.dt.year
    trips2['Duration (Hours)'] = trips2.Duration
    utilization = pd.pivot_table(trips2, values='Distance (KM)',
                   index='Vehicle', columns=['year', 'month', 'day'],
                  fill_value=0.0, aggfunc=sum)

    def to_utilization_headers(date):
        return date.strftime('%a')[:2] + '-' + str(date.day)

    columns = pd.to_datetime(utilization.columns.to_frame().reset_index(drop=True)).apply(to_utilization_headers)
    utilization.columns = columns
    days_with_trips = (utilization>0.0).sum(axis=1)
    days_without_trips = (utilization==0.0).sum(axis=1)

    daily_utilization = pd.pivot_table(trips2, values='Distance (KM)',
                                             index='Vehicle', columns=trips2.TripStart.dt.day_name(),
                                             fill_value=0.0, aggfunc=sum
                                            )
    Weekends = ['Saturday', 'Sunday']
    weekdays = daily_utilization.columns.difference(Weekends)
    weekends = daily_utilization.columns.intersection(Weekends)
    utilization['Weekday Distance (km)'] = daily_utilization[weekdays].sum(axis=1)
    utilization['Weekend Distance (km)'] = daily_utilization[weekends].sum(axis=1)
    utilization['Total Distance (km)'] = daily_utilization.sum(axis=1)
    utilization['Days With Trips'] = days_with_trips
    utilization['Days Without Trips'] = days_without_trips
    utilization.sort_values(by='Total Distance (km)', ascending=True, inplace=True)
    #add totals cols
    all_cols = utilization.columns
    days_cols = utilization.filter(like='Days').columns
    distance_cols = all_cols.difference(days_cols)
    totals_col = utilization[distance_cols].sum(axis=0)
    totals_col.name = 'Totals'
    totals_col = pd.DataFrame(totals_col).T
    totals_col.index.name = utilization.index.name
    utilization = pd.concat([utilization, totals_col], axis=0)
    utilization[distance_cols] = utilization[distance_cols].round(2)
    return utilization


def make_fuel_report(trips_df):
    fuel_df = trips_df.rename(columns={'DistanceKilometers':'Distance(KM)', 'FuelUsedLitres':'Fuel Used (Litres)', 'AssetDescription':'Vehicle Description'})
    fuel_pvt = fuel_df.pivot_table(values=['Distance(KM)', 'Fuel Used (Litres)'], index='Vehicle Description', aggfunc='sum', fill_value=0.0)
    fuel_pvt['Fuel Consumption Rate (KM/L)'] = fuel_pvt['Distance(KM)'].div(fuel_pvt['Fuel Used (Litres)'])
    fuel_pvt.sort_values(by='Fuel Consumption Rate (KM/L)', inplace=True)
    return fuel_pvt





harsh_braking_comment = ' This violation causes damage of brake pads & Brake drums, suspension parts and may lead to tire burst and tire reduced tire life. Top violators were: '
harsh_acceleration_comment = ' This violation reduces tire life and increases fuel consumption. Top violators were: '
night_driving_comment = ' Night driving puts the goods at risk of theft and due to the poor visibility at night, accidents are also prone to happen. Top violators were: '
over_speeding_comment = ' This violation results in high fuel consumption, and a high risk of accidents. Top violators were: '
idle_excessive_comment= ' This violation leads to high fuel consumption. Top violators were: '
overreving_comment = ' This violation causes increased tear and wear of the vehicle engine parts and high fuel consumption. Top violators were: '
diag_no_eng_rpm_comment= ' This causes vehicles to miss out on some crucial events such as freewheeling, and over revving. Top violators were: '
free_wheeling_comment = ' Freewheeling is likely to cause Gearbox Damage and engine problems in case the driver engages the wrong gear after freewheeling, there’s also increased chances of an accident. Top violators were: '

def get_comment(event):
    comment = 'ZZZ'
    if type(event) == float:
        return comment
    e = event.lower()
    if 'brak' in e:
        comment = harsh_braking_comment
    elif 'acce' in e:
        comment = harsh_acceleration_comment
    elif 'night' in e:
        comment = night_driving_comment
    elif 'speed' in e:
        comment = over_speeding_comment
    elif 'idle' in e:
        comment = idle_excessive_comment
    elif 'revv' in e:
        comment = overreving_comment
    elif 'rpm' in e:
        comment = diag_no_eng_rpm_comment
    elif 'free' in e:
        comment = free_wheeling_comment
    return comment

def write_top_n(events_df, trips_df, n=3, bins=None, entity_column_name='AssetDescription'):
    if not bins:
        bins = [0, 20, 40, 100]
    res_out = []
    res_out2 = []
    #add_entities ==> #add this number of entities to green if event assets are less than trip assets
    n_entities = max(0, trips_df[entity_column_name].nunique() - events_df[entity_column_name].nunique())
    #for tpl in [res]:
    df = events_df[events_df.EventName.notna()].copy()
    vals_ = ['Duration', 'TotalOccurances', 'DistanceKilometers']
    units = dict(zip(vals_, ['hours', 'occurrences', 'KM']))#for use in output string
    values = [a for a in df.columns if a in vals_]
    events = df.EventName.unique()
    pvt_df = df.pivot_table(values=values, index=entity_column_name, columns='EventName', aggfunc=sum, fill_value=0.0)
    pvt_df['Advanced Score'] = pvt_df['TotalOccurances'].sum(axis=1)
    rag_labels = ['Green', 'Amber', 'Red']
    pvt_df['RAG'] = pd.cut(pvt_df['Advanced Score'], bins=bins, labels=rag_labels).fillna('Red')#fillna for values above 100000
    #n_counts = pvt_df['RAG'].value_counts()
    #n_counts_pct = pvt_df['RAG'].value_counts(normalize=True)*100
    #for rag_label in rag_labels:
    #        res_out2.append({'Rag Label':rag_label, 'Metric':f'There are {n_counts.get(rag_label)} vehicles in this category, which represents {n_counts_pct.get(rag_label)}% of the fleet.'})
    for event in events:
        comment = get_comment(event)
        if not comment:
            continue
        for rag_label in rag_labels:
            for val in values:
                unit = units[val]
                s = pvt_df[pvt_df.RAG==rag_label][val][event].sort_values(ascending=False)[:n]
                if val in ['Duration', 'DistanceKilometers']:
                    s = s.round(2)
                s = s[s>0]#remove zero parameter events
                result_string = ", ".join([f'({k}, {v} {unit})' for k, v in s.items()])
                res_out.append(['', event, rag_label, val, result_string])
                res_out2.append({'DataFrame':'', 'Event':event, 'Rag Label':rag_label, 'Metric':val, f'Top {n}':f'{event}:{comment}{result_string}'})
    res_out = pd.DataFrame(res_out, columns=['DataFrame', 'Event', 'Rag Label', 'Metric', f'Top {n}'])
    res_out2 = pd.DataFrame(res_out2)[['DataFrame', 'Event', 'Rag Label', 'Metric', f'Top {n}']]
    return res_out, res_out2
