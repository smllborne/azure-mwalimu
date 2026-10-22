-- Add six original AZ-900 practice questions, two for each exam domain.
WITH sample_questions(domain, topic_name, question_text, options, correct_index, explanation, why_others_wrong, difficulty, african_example) AS (
  VALUES
    (
      'Cloud Concepts',
      'Benefits of Cloud Computing',
      'A Kenyan retailer has a large traffic spike during a holiday sale, then much lower traffic afterward. Which cloud benefit lets it add and remove resources as demand changes?',
      '["High availability","Elasticity","Disaster recovery","Governance"]'::jsonb,
      1,
      'Elasticity is the ability to increase or decrease cloud resources in response to changing demand, so the retailer can scale up for the sale and scale back afterward.',
      '["High availability focuses on keeping a service accessible, not matching capacity to changing demand.","","Disaster recovery focuses on restoring services after a major disruption.","Governance applies rules and controls to cloud resources; it does not automatically scale capacity."]'::jsonb,
      'easy',
      'An online shop in Nairobi can add application instances during a major promotion and remove them when orders return to normal, helping avoid paying for idle capacity.'
    ),
    (
      'Cloud Concepts',
      'Cloud Service Types (IaaS, PaaS, SaaS)',
      'A small accounting firm wants to use a complete online bookkeeping application without managing its servers, operating system, or application updates. Which cloud service type best fits?',
      '["Infrastructure as a service (IaaS)","Platform as a service (PaaS)","Software as a service (SaaS)","A private cloud"]'::jsonb,
      2,
      'Software as a service provides a ready-to-use application that the provider operates and maintains, leaving the firm to use the software rather than manage its platform.',
      '["IaaS provides infrastructure but leaves the customer responsible for managing the operating system and applications.","PaaS provides a managed platform for building and deploying applications, rather than a finished bookkeeping app.","","A private cloud describes a deployment model, not the managed application service the firm needs."]'::jsonb,
      'easy',
      'A bookkeeping firm in Accra can sign in to a hosted accounting app to manage invoices without purchasing servers or installing software updates itself.'
    ),
    (
      'Azure Architecture & Services',
      'Core Azure Architectural Components',
      'A company wants to deploy an Azure resource in a specific geographic area to meet local latency and data-residency needs. Which Azure architectural component should it choose?',
      '["An availability zone","An Azure region","A resource group","A management group"]'::jsonb,
      1,
      'An Azure region is a geographic area containing one or more datacenters. Selecting a region determines where supported resources are deployed.',
      '["An availability zone is a physically separate location within a region, used to improve resilience within that region.","","A resource group is a logical container for related resources, not a geographic deployment location.","A management group organizes subscriptions for governance; it does not choose a resource location."]'::jsonb,
      'medium',
      'A business serving customers in South Africa might choose a nearby supported Azure region to reduce network latency, while checking applicable data-location requirements.'
    ),
    (
      'Azure Architecture & Services',
      'Azure Compute & Networking Services',
      'A developer needs to run a small event-driven function only when a new order is received, without keeping a server running between orders. Which Azure service is the best fit?',
      '["Azure Virtual Machines","Azure Functions","Azure Virtual Network","Azure Kubernetes Service"]'::jsonb,
      1,
      'Azure Functions is a serverless compute service that can run code in response to events, scaling execution without requiring the developer to manage always-on servers.',
      '["Virtual machines provide general-purpose compute, but the customer must manage the VM and its operating system.","","A virtual network provides private network connectivity and does not run application code.","Kubernetes Service orchestrates containers; it is more operationally involved than a simple event-triggered function."]'::jsonb,
      'medium',
      'A delivery service in Lagos could trigger a function when an order is placed to send a confirmation, rather than running a dedicated server just for that task.'
    ),
    (
      'Azure Management & Governance',
      'Cost Management in Azure',
      'An administrator wants to receive an alert when a subscription''s tracked spending reaches a planned monthly amount. Which Azure Cost Management feature should they configure?',
      '["A budget with an alert","A resource lock","An Azure Policy assignment","A service health alert"]'::jsonb,
      0,
      'A cost-management budget tracks spending against a configured amount and can trigger alerts when actual or forecast costs reach specified thresholds.',
      '["","A resource lock helps prevent accidental changes or deletion; it does not track spending.","Azure Policy evaluates and enforces resource rules, not cost thresholds.","A service health alert reports service issues and maintenance, not subscription spending."]'::jsonb,
      'easy',
      'A university in Kampala can set a monthly budget for a student lab subscription and notify its administrator when spending approaches the approved amount.'
    ),
    (
      'Azure Management & Governance',
      'Governance & Compliance',
      'A company needs to require that newly created Azure resources include a department tag. Which Azure governance service can enforce this rule?',
      '["Azure Policy","Azure Advisor","Azure Service Health","Azure Monitor"]'::jsonb,
      0,
      'Azure Policy evaluates resources against organizational rules and can deny or audit deployments that do not meet requirements, such as a required tag.',
      '["","Azure Advisor offers recommendations for reliability, security, performance, and cost; it does not enforce this deployment requirement.","Azure Service Health communicates Azure service issues and planned maintenance; it does not govern resource tags.","Azure Monitor collects and analyzes telemetry; it does not enforce required tags on resource creation."]'::jsonb,
      'medium',
      'A public agency in Tanzania can use a policy to require a department tag on new cloud resources, making ownership and cost reporting easier.'
    )
)
INSERT INTO questions (
  topic_id,
  question_text,
  options,
  correct_index,
  explanation,
  why_others_wrong,
  difficulty,
  african_example
)
SELECT
  topic.id,
  sample.question_text,
  sample.options,
  sample.correct_index,
  sample.explanation,
  sample.why_others_wrong,
  sample.difficulty,
  sample.african_example
FROM sample_questions AS sample
JOIN LATERAL (
  SELECT id
  FROM topics
  WHERE name = sample.topic_name
    AND domain = sample.domain
  ORDER BY id
  LIMIT 1
) AS topic ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM questions AS existing
  WHERE existing.topic_id = topic.id
    AND existing.question_text = sample.question_text
);
