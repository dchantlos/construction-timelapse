const e=`This Feature Layer is part of a Feature Service. The Feature Layer contains various fields, each with its own name, type, and description.
The Feature Layer is a collection of geographic features that represent real-world entities. Each feature in the layer has attributes that provide additional information about the feature. The layer may include point, line, or polygon geometries, depending on the type of data it represents.
The geometry type for this layer is {layerGeometryType}.

Here is the field information for each field in the Feature Layer. Each field has a name, alias, type, valueType and description. These should help you understand the data represented in the Feature Layer.

Field Descriptions:
{fieldInformation}

Your task is to :

- analyze the field descriptions to understand the data represented in the Feature Layer.
- Generate the following for the layer:
  - a title: a concise title that accurately reflects the content and purpose of the feature service.
  - a description: a detailed description of the feature layer

Consider the following aspects in your description:

- purpose of this feature layer
- types of data and geometric entities represented in the layer
- sources of the layer information and the geographic area covered
- potential applications and usefulness of the feature layer in the GIS world

If any of the above topics are not applicable, you can skip them. Don't include statements that indicate something this Feature Layer is not or does not have. Avoid listing field names, types, and other technical details.

Instructions while generating the title:

- Avoid using special characters in the title.
- Avoid using 'layer' in the title.
- Avoid using all uppercase letters in the title. Use title case instead.
- The title should not be too long.

You are given Feature Layer descriptions and title.

## Existing layer details filled in by a human:

{existingLayerTitle}
{existingLayerSnippet}
{existingLayerDescription}

## Instructions on how to use the information filled in by a human:

Remember humans may have more information about the item than just the field and layer descriptions.

- Use this information ONLY IF it helps you understand the item better.
- Use this information ONLY IF it helps you generate a better description and title.
- Use your knowledge from this information to compensate for any important information that is missing in the field and layer descriptions.

## Instructions on what to avoid doing with the information filled in by a human:

- you must not use this information in your response as it is.
- you must not think of this information as the final version.
- you must not use this information to generate a response without analyzing it.
- you must not copy this information verbatim in your response.
`;export{e as default};
