---
layout: layout.pug
navigationTitle:  Labeling Tasks and Jobs
title: Labeling Tasks and Jobs
menuWeight: 6
excerpt:

enterprise: false
---

<!-- This source repo for this topic is https://github.com/dcos/dcos-docs -->


This tutorial illustrates how labels can be defined using the DC/OS web interface and the Marathon HTTP API, and how information pertaining to applications and jobs that are running can be queried based on label value criteria.

When you deploy applications, containers, or jobs in a DC/OS cluster, you can associate a tag or label with your deployed components to track and report usage of the cluster by those components. For example, you may want to assign a cost center identifier or a customer number to a Mesos application and produce a summary report at the end of the month with usage metrics such as the amount of CPU and memory allocated to the applications by cost center or customer.

# Assigning Labels to Applications and Tasks

You can attach labels to tasks either via the **Services** tab of the DC/OS web interface or from the DC/OS CLI. You can specify more than one label, but each label can have only one value.

## Assign a Label to an Application or Task from the DC/OS Web Interface

From the DC/OS web interface, click the **Services** tab. You can add labels when you deploy a new service or edit an existing one from the **Labels** tab.

## Assign a Label to an Application or Task from the DC/OS CLI

You can also specify label values in the `labels` parameter of your application definition. 

    vi myapp.json
    
    {
        "id": "myapp",
        "cpus": 0.1,
        "mem": 16.0,
        "ports": [
            0
        ],
        "cmd": "/opt/mesosphere/bin/python3 -m http.server $PORT0",
        "instances": 2,
        "labels": {
            "COST_CENTER": "0001"
        }
    }

Then, deploy from the DC/OS CLI:

```bash
dcos marathon app add <myapp>.json
```

# Assigning Labels to Jobs

You can attach labels to jobs either via the **Jobs** tab of the DC/OS web interface or from the DC/OS CLI. You can specify more than one label, but each label can have only one value.

## Assign a Label to a Job from the DC/OS Web Interface

From the DC/OS web interface, click the **Jobs** tab. You can add labels when you deploy a new job or edit an existing one from the **Labels** tab.

![Job label](/mesosphere/dcos/1.9/img/job-label.png)

## Assign a Label to a Job from the DC/OS CLI

You can also specify label values in the `labels` parameter of your job definition. 

    vi myjob.json
    
     ```json
        {
          "id": "my-job",
          "description": "A job that sleeps",
          "labels": {
            "department": "marketing"
          },
          "run": {
            "cmd": "sleep 1000",
            "cpus": 0.01,
            "mem": 32,
            "disk": 0
          }
        }
     ```

Then, deploy from the DC/OS CLI:

```bash
dcos job add <myjob>.json
```

# Displaying Label Information


Once your applications is deployed and started, you can filter by label from the **Services** tab of the DC/OS UI.

You can also use the Marathon HTTP API from the DC/OS CLI to query the running applications based on the label value criteria.
 
The code snippet below shows an HTTP request issued to the Marathon HTTP API. The curl program is used in this example to submit the HTTP GET request, but you can use any program that is able to send HTTP GET/PUT/DELETE requests. You can see the HTTP end-point is `https://52.88.210.228/marathon/v2/apps` and the parameters sent along with the HTTP request include the label criteria `?label=COST_CENTER==0001`:

    curl --insecure \
    > https://52.88.210.228/marathon/v2/apps?label=COST_CENTER==0001 \
    > | python -m json.tool | more

You can also specify multiple label criteria like so: `?label=COST_CENTER==0001,COST_CENTER==0002`

In the example above, the response you receive will include only the applications that have a label `COST_CENTER` defined with a value of `0001`. The resource metrics are also included, such as the number of CPU shares and the amount of memory allocated. At the bottom of the response, you can see the date/time this application was deployed, which can be used to compute the uptime for billing or charge-back purposes.
