import {
  BodyProcessFileUpload,
  CheckHealthData,
  FeedbackRequest,
  GenerateStudyMaterialsData,
  GenerateStudyMaterialsError,
  ProcessFileUploadData,
  ProcessFileUploadError,
  SendFeedbackData,
  SendFeedbackError,
  StudyMaterialRequest,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Brain<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   *
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  check_health = (params: RequestParams = {}) =>
    this.request<CheckHealthData, any>({
      path: `/_healthz`,
      method: "GET",
      ...params,
    });

  /**
   * @description Send feedback via email
   *
   * @tags dbtn/module:feedback, dbtn/hasAuth
   * @name send_feedback
   * @summary Send Feedback
   * @request POST:/routes/send-feedback
   */
  send_feedback = (data: FeedbackRequest, params: RequestParams = {}) =>
    this.request<SendFeedbackData, SendFeedbackError>({
      path: `/routes/send-feedback`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * No description
   *
   * @tags dbtn/module:study_material_generator, dbtn/hasAuth
   * @name generate_study_materials
   * @summary Generate Study Materials
   * @request POST:/routes/generate
   */
  generate_study_materials = (data: StudyMaterialRequest, params: RequestParams = {}) =>
    this.request<GenerateStudyMaterialsData, GenerateStudyMaterialsError>({
      path: `/routes/generate`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Handles PDF/TXT file upload, extracts text, and generates study materials.
   *
   * @tags dbtn/module:study_material_generator, dbtn/hasAuth
   * @name process_file_upload
   * @summary Process File Upload
   * @request POST:/routes/process-file-upload
   */
  process_file_upload = (data: BodyProcessFileUpload, params: RequestParams = {}) =>
    this.request<ProcessFileUploadData, ProcessFileUploadError>({
      path: `/routes/process-file-upload`,
      method: "POST",
      body: data,
      type: ContentType.FormData,
      ...params,
    });
}
