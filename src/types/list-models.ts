export type ListModelsOkResponse = {
  data: Array<any[] | boolean | number | number | null | ModelObject | string>;
  object: string;
  [property: string]: any;
};

export type ModelObject = {
  created: number;
  id: string;
  object: string;
  owned_by: string;
  [property: string]: any;
};
