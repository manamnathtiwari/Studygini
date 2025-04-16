import {
  BodyProcessFileUpload,
  CheckHealthData,
  FeedbackRequest,
  GenerateStudyMaterialsData,
  ProcessFileUploadData,
  SendFeedbackData,
  StudyMaterialRequest,
} from "./data-contracts";

export namespace Brain {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  export namespace check_health {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckHealthData;
  }

  /**
   * @description Send feedback via email
   * @tags dbtn/module:feedback, dbtn/hasAuth
   * @name send_feedback
   * @summary Send Feedback
   * @request POST:/routes/send-feedback
   */
  export namespace send_feedback {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = FeedbackRequest;
    export type RequestHeaders = {};
    export type ResponseBody = SendFeedbackData;
  }

  /**
   * No description
   * @tags dbtn/module:study_material_generator, dbtn/hasAuth
   * @name generate_study_materials
   * @summary Generate Study Materials
   * @request POST:/routes/generate
   */
  export namespace generate_study_materials {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = StudyMaterialRequest;
    export type RequestHeaders = {};
    export type ResponseBody = GenerateStudyMaterialsData;
  }

  /**
   * @description Handles PDF/TXT file upload, extracts text, and generates study materials.
   * @tags dbtn/module:study_material_generator, dbtn/hasAuth
   * @name process_file_upload
   * @summary Process File Upload
   * @request POST:/routes/process-file-upload
   */
  export namespace process_file_upload {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = BodyProcessFileUpload;
    export type RequestHeaders = {};
    export type ResponseBody = ProcessFileUploadData;
  }
}
