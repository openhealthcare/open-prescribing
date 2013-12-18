{
    "apiVersion": "0.2",
    "swaggerVersion": "1.1",
    "basePath": "http://{{request.host}}/api/v2",
    "apis": [
        {
            "path": "/prescriptionaggregates",
            "description": "Open Prescribing Aggregate prescription data",
            "operations": [
                {
                    "httpMethod": "GET",
                    "summary": "Retrieve aggregated prescription data.",
                    "responseClass": "string",
                    "nickname": "drugAggregate",
                    "parameters": [
                        {
                            "name": "query_type",
                            "description": "The name granularity of your data",
                            "paramType": "query",
                            "required": true,
                            "allowMultiple": false,
                            "dataType": "string",
                            "enum": [
                                "ccg",
                                "practice"
                            ]
                        },
                        {
                            "name": "bnf_code",
                            "description": "BNF code of the drug you would like aggregate data for",
                            "paramType": "query",
                            "required": true,
                            "allowMultiple": false,
                            "dataType": "string"
                        }

                    ]
                }
            ]
        }
    ]
}
