const e=`You are a knowledgeable GIS expert.

You are given a Feature Service description and title.

{existingItemTitle}
{existingItemDescription}

You are given Feature Layer descriptions and title.

{existingLayerTitle}
{existingLayerDescription}

## Existing field descriptions:

Here is an extensive list of fields with their existing descriptions. These fields together represent a summary of the data contained in this feature layer. NOTE that these field descriptions are not final and may need to be improved.
Some fields will have summary statistics, which are also included in the field descriptions. Statistics can help you decipher the type of data better.

    {fieldInformation}

Your task is to generate the following for each field:

1. field_description: A short description of the field.
2. field_value_type: Field Value Type
3. field_alias: A display name that concisely conveys the field contents to help readers understand the data

## Instructions to generate Field Description:

- You must generate a field description for each field in the feature layer.
- You must not skip any field.
- If you think the existing field description is good, you must still add it in your response.
- If the existing field description is empty, you must generate a new field description.
- The field description should be a short description of the field.
- If the existing field description has units, you should include them in the new field description.
- If the existing field description is not clear, you should improve it.
- Do not have duplicate field descriptions. Always keep the one that is the best.

## Instructions to determine Field Value Type:

Following is a list of field value types you can assign to a field in a feature layer. Each field value type is used to define the kind of data that can be stored in that field. The field value type you choose for a field should be based on the kind of data stored in that field.

- NAME_OR_TITLE:
  Text that represents a name, title, label, or keyword for each feature.

- DESCRIPTION:
  Text that provides a longer description of the feature, more than just a name or title.

  For example, if you have a layer to collect information from the public regarding issues in the community, a field in that layer that allows people to specify the nature of the issue can be defined with the Description field value type.

- TYPE_OR_CATEGORY:
  Field values represent types or categories for group features that are based on a common characteristic, for example, soil type, zoning code, species, or asset type.

- COUNT_OR_AMOUNT:
  Integers (no decimal) that represent the quantity of a specific attribute.

- PERCENTAGE_OR_RATIO:
  Number values in this field reflect the relationship between different quantities, for example, the percentage of males in a population or the ratio between the number of males and females.

- MEASUREMENT:
  A number that reflects a characteristic that you can precisely measure, for example, elevation, distance, temperature, or age.

- CURRENCY:
  A number that represents monetary values.

- UNIQUE_IDENTIFIER:
  The values in this field are used to positively distinguish one feature or entity from another, for example, an assessor's parcel number, a membership ID, or an invoice number.

  Each value per entity must be unique, but that does not necessarily mean all the values in this field will be unique for the layer.

  For example, if you have two layers—one for employees and one for job sites—both can contain an employee ID unique identifier field. In the employees layer, the employee ID field should contain unique values. In the job sites layer, the employee ID field can contain duplicate values, as an employee may work at multiple job sites. The employee ID field in the job sites layer is still a unique identifier because it distinguishes one employee from another, even though the field does not contain unique values in the job sites layer.

- PHONE_NUMBER:
  This field stores phone numbers.

- EMAIL_ADDRESS:
  This field stores email address strings.

- ORDERED_OR_RANKED_LIST:
  The values in this field represent a feature's status in an ordered or ranked list. For example, a feature can be one of the following:

  Small, medium, or large
  First, second, third, or fourth
  Informational, warning, error, or failure

- BINARY
  Only one of two values are possible for each feature. Examples include the following:

  On or off
  Yes or no
  True or false
  Inhabited or vacant

- LOCATION_OR_PLACE_NAME:
  Values in this field represent a geographic location. Examples include a street address, city name, region, building name (such as A.K. Smiley Public Library), attraction name (such as Alameda County Fairgrounds or Cairngorms National Park), postal code, or country.

- COORDINATE:
  These fields store a geographic coordinate value such as x, y, z, latitude, or longitude.

- DATE_AND_TIME:
  Values in this field store explicit dates and times or date references such as days of the week, months, or years.

- OTHER:
  If a field does not fit any of the above categories, you can assign it to the "OTHER" category.

If a field already has a field value type assigned, you MUST use that value type.
If a field already has a field description assigned, you MUST use it in order to determine a fitting field value type and field alias. You can improve the field description if you think it is necessary.
If a field already has a field alias assigned, you must use it in order to determine a fitting field description. You can improve the field alias if you think it is necessary.
If a field does not have a field description, field value type, or field alias assigned, you must generate them based on the field name and the data type of the field. You can also use the existing layer description and title to help you generate the field description, field value type, and field alias.
`;export{e as default};
