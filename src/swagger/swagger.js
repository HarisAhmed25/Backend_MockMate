module.exports = {
  openapi: "3.0.0",
  info: {
    title: "MockMate Backend API",
    version: "1.0.0",
    description: "API documentation for the MockMate interview preparation platform."
  },

  servers: [
    {
      url: process.env.SERVER_URL || "https://mockmate-frontend-six.vercel.app",
      description: "Local development server"
    }
  ],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    },
    schemas: {
      // -------------------------
      // ADMIN SCHEMAS
      // -------------------------
      AdminDashboardSummary: {
        type: "object",
        properties: {
          totalUsers: { type: "integer" },
          totalInterviews: { type: "integer" },
          interviewsToday: { type: "integer" },
          totalViolations: { type: "integer" },
          faceMismatchCount: { type: "integer" }
        }
      },
      AISettingsRequest: {
        type: "object",
        properties: {
          faceMismatchThreshold: { type: "number" },
          penaltyPointsPerIncident: { type: "integer" },
          maxEvidenceImages: { type: "integer" },
          gptModel: { type: "string" },
          isProctoringEnabled: { type: "boolean" },
          isFaceVerificationMandatory: { type: "boolean" }
        }
      },
      RoleRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          jobDescription: { type: "array", items: { type: "string" } }
        }
      },
      ViolationLogRequest: {
        type: "object",
        required: ["userId", "interviewId", "violationType", "actionTaken"],
        properties: {
          userId: { type: "string" },
          interviewId: { type: "string" },
          violationType: {
            type: "string",
            enum: ["camera_off", "camera_covered", "face_mismatch", "multiple_faces"]
          },
          actionTaken: {
            type: "string",
            enum: ["warning", "final_warning", "terminated"]
          },
          screenshot: {
            type: "string",
            description: "Base64 encoded image data (data:image/jpeg;base64,...)"
          },
          screenshotUrl: { type: "string" }
        }
      },
      // -------------------------
      // AUTH SCHEMAS
      // -------------------------
      RegisterRequest: {
        type: "object",
        required: ["name", "email", "password", "dob", "citizenship"],
        properties: {
          name: { type: "string" },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6 },
          dob: { type: "string", format: "date", example: "2001-07-21" },
          citizenship: { type: "string", example: "Pakistani" },
          faceEmbedding: {
            type: "array",
            items: { type: "number" }
          }
        }
      },
      LoginRequest: {
        type: "object",
        required: ["password"],
        properties: {
          email: { type: "string", description: "Email OR Username" },
          username: { type: "string", description: "Email OR Username" },
          password: { type: "string" }
        }
      },
      // ... rest of schemas will be kept as is after this block

      UpdateProfileRequest: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string", format: "email" }
        }
      },

      ChangePasswordRequest: {
        type: "object",
        required: ["oldPassword", "newPassword"],
        properties: {
          oldPassword: { type: "string" },
          newPassword: { type: "string", minLength: 6 }
        }
      },

      ForgotPasswordRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" }
        }
      },

      ResetPasswordRequest: {
        type: "object",
        required: ["token", "newPassword"],
        properties: {
          token: { type: "string" },
          newPassword: { type: "string", minLength: 6 }
        }
      },

      VerifyOtpRequest: {
        type: "object",
        required: ["email", "otp"],
        properties: {
          email: { type: "string", format: "email" },
          otp: { type: "string", example: "123456" }
        }
      },

      ResetPasswordOtpRequest: {
        type: "object",
        required: ["email", "newPassword"],
        properties: {
          email: { type: "string", format: "email" },
          newPassword: { type: "string", minLength: 6 }
        }
      },

      // -------------------------
      // PRE-INTERVIEW SCHEMA
      // -------------------------
      PreInterviewSetup: {
        type: "object",
        required: ["desiredRole", "experienceLevel"],
        properties: {
          desiredRole: { type: "string" },
          industry: { type: "string" },
          educationLevel: { type: "string" },
          experienceLevel: { type: "string" }
        }
      },

      // -------------------------
      // INTERVIEW SESSION SCHEMAS
      // -------------------------
      StartInterviewRequest: {
        type: "object",
        required: ["setupId"],
        properties: { setupId: { type: "string" } }
      },

      AnswerRequest: {
        type: "object",
        required: ["sessionId", "answer"],
        properties: {
          sessionId: { type: "string" },
          answer: { type: "string" }
        }
      },

      FinishInterviewRequest: {
        type: "object",
        required: ["sessionId"],
        properties: {
          sessionId: { type: "string" }
        }
      },

      BodyLanguageRequest: {
        type: "object",
        required: ["sessionId", "eyeContact", "engagement", "attention", "stability"],
        properties: {
          sessionId: {
            type: "string",
            description: "Interview session ID"
          },
          eyeContact: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description: "Eye contact score (0-100)"
          },
          engagement: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description: "Engagement score (0-100)"
          },
          attention: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description: "Attention score (0-100)"
          },
          stability: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description: "Stability score (0-100)"
          },
          expression: {
            type: "string",
            enum: ["happy", "sad", "nervous", "neutral", "shocked"],
            description: "Current facial expression"
          },
          expressionConfidence: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description: "Expression confidence score (0-100)"
          },
          dominantExpression: {
            type: "string",
            enum: ["happy", "sad", "nervous", "neutral", "shocked"],
            description: "Most common expression during interview"
          },
          sampleCount: {
            type: "number",
            minimum: 0,
            description: "Number of samples collected"
          },
          timestamp: {
            type: "number",
            description: "Unix timestamp (optional)"
          }
        }
      },

      // -------------------------
      // PERFORMANCE SUMMARY (REAL DB VALUES)
      // -------------------------
      PerformanceSummary: {
        type: "object",
        properties: {
          interviewsCompleted: { type: "number" },

          progressOverTime: {
            type: "array",
            items: { type: "number" }
          },

          overallScore: { type: "number" },
          overallPercentage: { type: "number" },
          improvement: { type: "number" },

          answerQuality: {
            type: "object",
            properties: {
              technicalAccuracy: { type: "number" },
              completeness: { type: "number" },
              conciseness: { type: "number" },
              problemSolving: { type: "number" }
            }
          },

          detailedAnswers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                sessionId: { type: "string" },
                questions: { type: "array" },
                finalSummary: { type: "string" }
              }
            }
          },

          bodyLanguage: {
            type: "object",
            properties: {
              eyeContact: { type: "number" },
              engagement: { type: "number" },
              attention: { type: "number" },
              stability: { type: "number" },
              expression: { type: "string", enum: ["happy", "sad", "nervous", "neutral", "shocked"] },
              expressionConfidence: { type: "number" },
              dominantExpression: { type: "string", enum: ["happy", "sad", "nervous", "neutral", "shocked"] },
              overallScore: { type: "number" }
            }
          },
          availableRoles: {
            type: "array",
            items: { type: "string" },
            description: "List of all unique roles from user's completed interviews"
          },
          interviews: {
            type: "array",
            items: {
              type: "object",
              properties: {
                interviewId: { type: "string" },
                score: { type: "number" },
                overallPercentage: { type: "number" },
                createdAt: { type: "string", format: "date-time" },
                role: { type: "string" }
              }
            },
            description: "List of individual interviews with basic performance data"
          }
        }
      },
      VerifyFaceRequest: {
        type: "object",
        required: ["userId", "faceEmbedding"],
        properties: {
          userId: { type: "string" },
          sessionId: { type: "string" },
          faceEmbedding: {
            type: "array",
            items: { type: "number" }
          }
        }
      },

      ViolationLogRequest: {
        type: "object",
        required: ["userId", "interviewId", "violationType", "actionTaken"],
        properties: {
          userId: { type: "string" },
          interviewId: { type: "string" },
          violationType: {
            type: "string",
            enum: ["camera_off", "camera_covered", "face_mismatch", "multiple_faces"]
          },
          actionTaken: {
            type: "string",
            enum: ["warning", "final_warning", "terminated"]
          },
          screenshot: {
            type: "string",
            description: "Base64 encoded image data (data:image/jpeg;base64,...)"
          },
          screenshotUrl: { type: "string" }
        }
      },
      AdminDashboardSummary: {
        type: "object",
        properties: {
          totalUsers: { type: "integer" },
          totalInterviews: { type: "integer" },
          interviewsToday: { type: "integer" },
          totalViolations: { type: "integer" },
          faceMismatchCount: { type: "integer" }
        }
      },
      AISettingsRequest: {
        type: "object",
        properties: {
          faceMismatchThreshold: { type: "number" },
          penaltyPointsPerIncident: { type: "integer" },
          maxEvidenceImages: { type: "integer" },
          gptModel: { type: "string" },
          isProctoringEnabled: { type: "boolean" },
          isFaceVerificationMandatory: { type: "boolean" }
        }
      },
      RoleRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          jobDescription: { type: "array", items: { type: "string" } }
        }
      }
    }
  },

  paths: {
    // -----------------------------------------------------------------------
    // ADMIN PANEL APIS
    // -----------------------------------------------------------------------
    "/api/admin/dashboard/summary": {
      get: {
        tags: ["Admin"],
        summary: "Get Admin Dashboard Summary",
        description: "Fetch high-level statistics: users, interviews, violations, etc.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Summary data fetched",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AdminDashboardSummary" } } }
          }
        }
      }
    },
    "/api/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List All Users",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "search", in: "query", schema: { type: "string" } }
        ],
        responses: {
          200: {
            description: "User list fetched with interview statistics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    users: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          _id: { type: "string" },
                          name: { type: "string" },
                          email: { type: "string" },
                          role: { type: "string" },
                          stats: {
                            type: "object",
                            properties: {
                              totalInterviews: { type: "integer" }
                            }
                          }
                        }
                      }
                    },
                    totalPages: { type: "integer" },
                    currentPage: { type: "integer" },
                    totalUsers: { type: "integer" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/admin/profile/{id}": {
      get: {
        tags: ["Admin"],
        summary: "Get Detailed User Profile (Admin View)",
        description: "Fetch comprehensive user data including stats, recent interviews, reports, and violation counts.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "User ID" }
        ],
        responses: {
          200: { description: "Detailed profile fetched" }
        }
      }
    },
    "/api/admin/interviews": {
      get: {
        tags: ["Admin"],
        summary: "List All Interviews",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Interview list fetched" } }
      }
    },
    "/api/admin/violations": {
      get: {
        tags: ["Admin"],
        summary: "List All Violation Logs",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Violations fetched" } }
      }
    },
    "/api/admin/ai-settings": {
      get: {
        tags: ["Admin"],
        summary: "Get AI Settings",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "AI settings fetched" } }
      },
      patch: {
        tags: ["Admin"],
        summary: "Update AI Settings",
        security: [{ bearerAuth: [] }],
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/AISettingsRequest" } } } },
        responses: { 200: { description: "Settings updated" } }
      }
    },
    "/api/admin/roles": {
      get: { tags: ["Admin"], summary: "List All Roles", security: [{ bearerAuth: [] }], responses: { 200: { description: "Roles fetched" } } },
      post: {
        tags: ["Admin"],
        summary: "Create New Role",
        security: [{ bearerAuth: [] }],
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/RoleRequest" } } } },
        responses: { 201: { description: "Role created" } }
      }
    },

    // -------------------------
    // VIOLATION LOGS
    // -------------------------
    "/api/interview/log-violation": {
      post: {
        tags: ["Interview"],
        security: [{ bearerAuth: [] }],
        summary: "Log a proctoring violation",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ViolationLogRequest" } }
          }
        },
        responses: {
          201: { description: "Violation logged successfully" },
          400: { description: "Missing required fields" },
          401: { description: "Not authorized" }
        }
      }
    },

    "/api/interview/violations/{interviewId}": {
      get: {
        tags: ["Interview"],
        security: [{ bearerAuth: [] }],
        summary: "Get all violations for an interview session (Audit Trail)",
        parameters: [
          {
            name: "interviewId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Interview session ID"
          }
        ],
        responses: {
          200: { description: "List of violations fetched successfully" },
          401: { description: "Not authorized" }
        }
      }
    },

    // -------------------------
    // AUTH ROUTES
    // -------------------------
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } }
          }
        },
        responses: { 201: { description: "User registered" } }
      }
    },

    "/api/auth/register-admin": {
      post: {
        tags: ["Auth"],
        summary: "Register a new ADMIN (Requires Secret)",
        description: "Creates a user with 'admin' role. Only requires username and password.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "password", "adminSecret"],
                properties: {
                  username: { type: "string" },
                  password: { type: "string" },
                  adminSecret: { type: "string", default: "admin123" },
                  name: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "Admin registered" },
          403: { description: "Invalid Secret Key" }
        }
      }
    },

    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["password"],
                properties: {
                  username: { type: "string", description: "Username (or Email)" },
                  password: { type: "string" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Login success" } }
      }
    },

    "/api/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Send OTP for password reset",
        description: "Generates a 6-digit OTP, stores only its hash in DB with 5-minute expiry, and sends the OTP to the user's email.",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ForgotPasswordRequest" } }
          }
        },
        responses: {
          200: {
            description: "OTP sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "OTP sent successfully" }
                  }
                }
              }
            }
          }
        }
      }
    },

    "/api/auth/verify-otp": {
      post: {
        tags: ["Auth"],
        summary: "Verify OTP for password reset",
        description: "Verifies the OTP for the given email and marks otpVerified=true if valid and not expired.",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/VerifyOtpRequest" } }
          }
        },
        responses: {
          200: {
            description: "OTP verified",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "OTP verified successfully" }
                  }
                }
              }
            }
          },
          400: {
            description: "Invalid or expired OTP / validation error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string", example: "Invalid or expired OTP" }
                  }
                }
              }
            }
          }
        }
      }
    },

    "/api/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password after OTP verification",
        description: "Resets the user's password if otpVerified=true and OTP has not expired. Clears OTP fields after success.",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ResetPasswordOtpRequest" } }
          }
        },
        responses: {
          200: {
            description: "Password reset successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Password reset successfully" }
                  }
                }
              }
            }
          },
          400: { description: "Validation error / OTP expired" },
          403: { description: "OTP not verified" },
          404: { description: "User not found" }
        }
      }
    },

    // -------------------------
    // REPORT ROUTES
    // -------------------------
    "/api/reports": {
      get: {
        tags: ["Reports"],
        security: [{ bearerAuth: [] }],
        summary: "Get all interview reports for logged-in user",
        description: "Returns minimal report data for listing (latest first). Optional: pass ids=ID1,ID2 to fetch multiple full reports in one call.",
        parameters: [
          {
            name: "ids",
            in: "query",
            required: false,
            schema: { type: "string", example: "ID1,ID2" },
            description: "Comma-separated InterviewReport ids to fetch multiple full reports"
          }
        ],
        responses: {
          200: {
            description: "Reports list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    reports: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          _id: { type: "string" },
                          interviewId: { type: "string" },
                          role: { type: "string" },
                          overallPercentage: { type: "number" },
                          createdAt: { type: "string", format: "date-time" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          401: { description: "Not authorized" }
        }
      }
    },

    "/api/reports/compare": {
      get: {
        tags: ["Reports"],
        security: [{ bearerAuth: [] }],
        summary: "Compare two reports (side-by-side)",
        description: "Compares ONLY within the same role. Default: compares user's latest report vs previous report with the SAME role. Optional: pass first & second ids (must be same role).",
        parameters: [
          { name: "first", in: "query", required: false, schema: { type: "string" }, description: "First report id (optional, must be provided with second)" },
          { name: "second", in: "query", required: false, schema: { type: "string" }, description: "Second report id (optional, must be provided with first)" }
        ],
        responses: {
          200: { description: "Comparison result" },
          400: { description: "Missing or invalid ids" },
          401: { description: "Not authorized" },
          404: { description: "Report not found" }
        }
      }
    },

    "/api/reports/{id}": {
      get: {
        tags: ["Reports"],
        security: [{ bearerAuth: [] }],
        summary: "Get full interview report by id (ownership enforced)",
        description: "Returns full report plus improvement analytics compared to the user's previous report.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "InterviewReport document id"
          }
        ],
        responses: {
          200: {
            description: "Full report",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    report: { type: "object" },
                    previousReport: { type: "object", nullable: true },
                    improvement: { type: "object" }
                  }
                }
              }
            }
          },
          400: { description: "Invalid report id" },
          401: { description: "Not authorized" },
          404: { description: "Report not found" }
        }
      }
    },

    "/api/reports/{id}/pdf": {
      get: {
        tags: ["Reports"],
        security: [{ bearerAuth: [] }],
        summary: "Get PDF-ready report data (no PDF generation)",
        description: "Returns structured data suitable for future PDF generation.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "InterviewReport document id" }
        ],
        responses: {
          200: { description: "PDF-ready payload" },
          400: { description: "Invalid report id" },
          401: { description: "Not authorized" },
          404: { description: "Report not found" }
        }
      }
    },

    "/api/auth/google/start": {
      get: {
        tags: ["Auth"],
        summary: "Start Google OAuth flow (login or signup) - redirects to Google consent page",
        description: "Initiates Google OAuth 2.0 authentication flow. Use the mode query parameter to indicate whether this is a login or signup attempt. Redirects browser directly to Google's consent page. After user authorizes, Google redirects to /api/auth/google/callback",
        parameters: [
          {
            name: "mode",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["login", "signup"] },
            description: "Whether this Google OAuth attempt is for login or signup (default: login)"
          }
        ],
        responses: {
          302: {
            description: "Redirects to Google OAuth consent page",
            headers: {
              Location: {
                schema: { type: "string" },
                description: "Google OAuth consent URL"
              }
            }
          },
          500: {
            description: "Server configuration error - Google OAuth credentials missing",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Google OAuth configuration missing. Please check environment variables." }
                  }
                }
              }
            }
          }
        }
      }
    },

    "/api/auth/google/callback": {
      get: {
        tags: ["Auth"],
        summary: "Google OAuth callback - handles Google redirect",
        description: "Handles the OAuth callback from Google. Exchanges authorization code for tokens, verifies user identity, then either logs in an existing account (mode=login) or creates a new account (mode=signup). By default it redirects to the frontend callback page with token or error. If format=json (or Accept: application/json), it returns JSON with 200 on success and 400 on errors.",
        parameters: [
          {
            name: "code",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Authorization code from Google (present on success)"
          },
          {
            name: "error",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Error from Google OAuth (present on failure)"
          },
          {
            name: "format",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["json"] },
            description: "If set to json, returns JSON with 200/400 instead of redirecting"
          }
        ],
        responses: {
          302: {
            description: "Redirects to frontend callback page",
            headers: {
              Location: {
                schema: { type: "string" },
                description: "Frontend callback URL with token or error"
              }
            }
          }
        }
      }
    },

    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        summary: "Get current authenticated user",
        description: "Returns the current user's profile data. Requires valid JWT token in Authorization header.",
        responses: {
          200: {
            description: "User data retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        email: { type: "string" },
                        avatar: { type: "string", nullable: true },
                        provider: { type: "string", enum: ["local", "google"] },
                        googleId: { type: "string", nullable: true },
                        dob: { type: "string", format: "date", nullable: true },
                        citizenship: { type: "string" },
                        lastLoginAt: { type: "string", format: "date-time", nullable: true },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" }
                      }
                    }
                  }
                }
              }
            }
          },
          401: {
            description: "Not authorized - invalid or missing token",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Not authorized, token missing" }
                  }
                }
              }
            }
          },
          404: {
            description: "User not found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "User not found" }
                  }
                }
              }
            }
          }
        }
      }
    },

    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout user",
        description: "Logs out the current user. For JWT-based auth, this is handled client-side by removing the token.",
        responses: {
          200: {
            description: "Logout successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Logged out successfully" }
                  }
                }
              }
            }
          }
        }
      }
    },

    // -------------------------
    // PROFILE ROUTES
    // -------------------------
    "/api/profile/me": {
      get: {
        tags: ["Profile"],
        security: [{ bearerAuth: [] }],
        summary: "Get logged-in user profile",
        responses: { 200: { description: "User fetched" } }
      }
    },
    "/api/profile/": {
      get: {
        tags: ["Profile"],
        security: [{ bearerAuth: [] }],
        summary: "Get logged-in user profile (Alias for /me)",
        responses: { 200: { description: "User fetched" } }
      }
    },
    "/api/profile/{id}": {
      get: {
        tags: ["Profile"],
        security: [{ bearerAuth: [] }],
        summary: "Get user profile by ID",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "User ID" }
        ],
        responses: { 200: { description: "User fetched" } }
      }
    },

    "/api/profile/update": {
      put: {
        tags: ["Profile"],
        security: [{ bearerAuth: [] }],
        summary: "Update name & email",
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UpdateProfileRequest" } }
          }
        },
        responses: { 200: { description: "Profile updated" } }
      }
    },

    "/api/profile/update-password": {
      put: {
        tags: ["Profile"],
        security: [{ bearerAuth: [] }],
        summary: "Change password",
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ChangePasswordRequest" } }
          }
        },
        responses: { 200: { description: "Password updated" } }
      }
    },

    // -------------------------
    // PRE-INTERVIEW ROUTES
    // -------------------------
    "/api/interview/setup": {
      post: {
        tags: ["PreInterview"],
        security: [{ bearerAuth: [] }],
        summary: "Create a pre-interview setup",
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/PreInterviewSetup" } }
          }
        },
        responses: { 201: { description: "Setup created" } }
      },

      get: {
        tags: ["PreInterview"],
        security: [{ bearerAuth: [] }],
        summary: "Get user's pre-interview setups",
        parameters: [
          { name: "latest", in: "query", schema: { type: "boolean" } }
        ],
        responses: { 200: { description: "Fetched setups" } }
      }
    },

    "/api/interview/setup/{id}": {
      delete: {
        tags: ["PreInterview"],
        security: [{ bearerAuth: [] }],
        summary: "Delete setup by ID",
        parameters: [
          { name: "id", required: true, in: "path", schema: { type: "string" } }
        ],
        responses: { 200: { description: "Deleted" } }
      }
    },

    // -------------------------
    // INTERVIEW SESSION
    // -------------------------
    "/api/interview/start": {
      post: {
        tags: ["InterviewSession"],
        security: [{ bearerAuth: [] }],
        summary: "Start an interview session (generate questions)",
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/StartInterviewRequest" } }
          }
        },
        responses: { 200: { description: "Session started" } }
      }
    },

    "/api/interview/answer": {
      post: {
        tags: ["InterviewSession"],
        security: [{ bearerAuth: [] }],
        summary: "Submit one answer & receive next question",
        requestBody: {
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/AnswerRequest" } }
          }
        },
        responses: { 200: { description: "Next question returned" } }
      }
    },

    "/api/interview/finish": {
      post: {
        tags: ["InterviewSession"],
        security: [{ bearerAuth: [] }],
        summary: "Finish interview, score answers, compute evaluation, and generate AI tips (stored per session)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/FinishInterviewRequest" }
            }
          }
        },
        responses: {
          200: {
            description: "Interview evaluated and AI tips generated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },

                    questions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          question: { type: "string" },
                          answer: { type: "string" },
                          score: { type: "number" },
                          feedback: { type: "string" }
                        }
                      }
                    },

                    technicalAccuracy: { type: "number" },
                    completeness: { type: "number" },
                    conciseness: { type: "number" },
                    problemSolving: { type: "number" },

                    totalScore: { type: "number" },
                    overallPercentage: { type: "number" },

                    summary: { type: "string" },

                    // 🌟 NEW: Final AI tips generated during finishInterview
                    // Format: Array of objects with tip, example, and resources
                    tips: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          tip: { type: "string", example: "Improve problem-solving skills by practicing algorithmic thinking" },
                          example: { type: "string", example: "Solve 2 coding problems daily on LeetCode focusing on arrays and strings" },
                          resources: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                type: { type: "string", enum: ["book", "website", "course", "article"], example: "book" },
                                name: { type: "string", example: "Cracking the Coding Interview" },
                                link: { type: "string", example: "https://www.amazon.com/dp/0984782850" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },

    "/api/interview/body-language": {
      post: {
        tags: ["InterviewSession"],
        security: [{ bearerAuth: [] }],
        summary: "Save body language analysis results from MediaPipe",
        description: "Stores body language metrics (eye contact, engagement, attention, stability, expression) for an interview session. Supports periodic updates (every 10 seconds) and final save on interview end. Uses upsert logic (updates if exists, creates if not).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BodyLanguageRequest" },
              example: {
                sessionId: "67890abcdef1234567890123",
                eyeContact: 85,
                engagement: 70,
                attention: 75,
                stability: 80,
                expression: "happy",
                expressionConfidence: 75,
                dominantExpression: "happy",
                sampleCount: 150,
                timestamp: 1234567890
              }
            }
          }
        },
        responses: {
          200: {
            description: "Body language analysis saved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Body language analysis saved successfully" }
                  }
                }
              }
            }
          },
          400: {
            description: "Invalid request - validation error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string", example: "Invalid body language scores" },
                    errors: {
                      type: "array",
                      items: { type: "string" },
                      example: ["eyeContact must be between 0 and 100"]
                    }
                  }
                }
              }
            }
          },
          404: {
            description: "Interview session not found or access denied",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string", example: "Interview session not found or access denied" }
                  }
                }
              }
            }
          }
        }
      }
    },

    "/api/interview/body-language/{sessionId}": {
      get: {
        tags: ["InterviewSession"],
        security: [{ bearerAuth: [] }],
        summary: "Get body language data for a specific interview session",
        description: "Retrieves body language analysis data for a specific interview session. Returns 404 if session not found or no body language data exists.",
        parameters: [
          {
            name: "sessionId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Interview session ID"
          }
        ],
        responses: {
          200: {
            description: "Body language data retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    bodyLanguage: {
                      type: "object",
                      properties: {
                        eyeContact: { type: "number", example: 85 },
                        engagement: { type: "number", example: 70 },
                        attention: { type: "number", example: 75 },
                        stability: { type: "number", example: 80 },
                        expression: { type: "string", example: "happy" },
                        expressionConfidence: { type: "number", example: 75 },
                        dominantExpression: { type: "string", example: "happy" },
                        sampleCount: { type: "number", example: 150 },
                        lastUpdated: { type: "string", format: "date-time" }
                      }
                    }
                  }
                }
              }
            }
          },
          404: {
            description: "Session not found or no body language data",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string", example: "No body language data found for this session" }
                  }
                }
              }
            }
          }
        }
      }
    },

    "/api/verify-face": {
      post: {
        tags: ["InterviewSession"],
        security: [{ bearerAuth: [] }],
        summary: "Verify face identity matching against registered user embedding",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/VerifyFaceRequest" } }
          }
        },
        responses: {
          200: {
            description: "Verification result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    verified: { type: "boolean" },
                    similarity: { type: "number" },
                    faceMismatchCount: { type: "number" },
                    shouldTerminate: { type: "boolean" },
                    message: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },

    "/api/interview/detect-cheating": {
      post: {
        tags: ["CheatingDetection"],
        summary: "Detect cheating materials in an image frame (YOLOv8)",
        description: "Proxies an image (multipart file or base64) to the Python AI service. If cheating is detected, marks are deducted and evidence images are saved.",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary" },
                  sessionId: { type: "string" }
                }
              }
            },
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  image: { type: "string", description: "Base64 encoded image" },
                  sessionId: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Detection result with penalty info",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    phoneDetected: { type: "boolean" },
                    confidence: { type: "number" },
                    detectedObjects: { type: "array", items: { type: "string" } },
                    cheatingPenalty: {
                      type: "object",
                      properties: {
                        applied: { type: "boolean" },
                        deduction: { type: "number" },
                        totalIncidents: { type: "number" },
                        currentScore: { type: "number" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },

    // -------------------------
    // ROLES ROUTES
    // -------------------------
    "/api/roles/suggestions": {
      get: {
        tags: ["Roles"],
        summary: "Get AI-powered job role suggestions based on partial input",
        description: "Returns exactly 5 highly relevant, professional, and authentic job role titles that start with or are closely related to the query string.",
        parameters: [
          {
            name: "query",
            in: "query",
            required: true,
            schema: { type: "string", example: "fro" },
            description: "Partial role name (min 2 characters)"
          }
        ],
        responses: {
          200: {
            description: "Role suggestions retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    query: { type: "string", example: "fro" },
                    suggestions: {
                      type: "array",
                      items: { type: "string" },
                      example: ["Frontend Developer", "Front-end Engineer", "Front end Web Developer", "Frontend Architect", "Frontend Lead"]
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/roles/{role}/jd": {
      get: {
        tags: ["Roles"],
        summary: "Get job descriptions for a specific role",
        description: "Returns professional job descriptions (JDs) for supported roles only. Supported roles: frontend, backend, sqa. Invalid roles return empty array with validRole: false.",
        parameters: [
          {
            name: "role",
            in: "path",
            required: true,
            schema: { type: "string", example: "frontend" },
            description: "Job role (supported: frontend, backend, sqa)"
          }
        ],
        responses: {
          200: {
            description: "Job descriptions retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    validRole: { type: "boolean", example: true, description: "true if role is supported, false if invalid" },
                    role: { type: "string", example: "frontend" },
                    jobDescriptions: {
                      type: "array",
                      items: { type: "string" },
                      example: [
                        "Build responsive and interactive user interfaces using modern frameworks",
                        "Implement pixel-perfect designs with HTML, CSS, and JavaScript",
                        "Optimize application performance and ensure cross-browser compatibility"
                      ],
                      description: "Empty array if role is invalid"
                    }
                  }
                }
              }
            }
          },
          400: {
            description: "Role parameter is required",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    validRole: { type: "boolean", example: false },
                    message: { type: "string", example: "Role parameter is required" },
                    jobDescriptions: { type: "array", items: { type: "string" }, example: [] }
                  }
                }
              }
            }
          }
        }
      }
    },

    // -------------------------
    // PERFORMANCE ROUTES
    // -------------------------
    "/api/performance/summary": {
      get: {
        tags: ["Performance"],
        security: [{ bearerAuth: [] }],
        summary: "Get user's performance summary based on past interviews",
        parameters: [
          {
            name: "role",
            in: "query",
            required: false,
            schema: { type: "string", example: "frontend" },
            description: "Filter by role (all, frontend, backend, sqa, or any custom role)"
          }
        ],
        responses: {
          200: {
            description: "Performance summary returned",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PerformanceSummary" }
              }
            }
          }
        }
      }
    },

    "/api/interview/{interviewId}/performance": {
      get: {
        tags: ["Performance"],
        security: [{ bearerAuth: [] }],
        summary: "Get detailed performance of a single interview",
        description: "Fetches complete performance data for a specific interview by interviewId. Returns 404 if interview not found, not completed, or doesn't belong to the user.",
        parameters: [
          {
            name: "interviewId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Interview session ID (MongoDB ObjectId)"
          }
        ],
        responses: {
          200: {
            description: "Interview performance retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    performance: {
                      type: "object",
                      properties: {
                        interviewId: { type: "string" },
                        role: { type: "string", example: "frontend" },
                        score: { type: "number", example: 85 },
                        overallPercentage: { type: "number", example: 80 },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                        answerQuality: {
                          type: "object",
                          properties: {
                            technicalAccuracy: { type: "number" },
                            completeness: { type: "number" },
                            conciseness: { type: "number" },
                            problemSolving: { type: "number" }
                          }
                        },
                        questions: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              question: { type: "string" },
                              answer: { type: "string" },
                              score: { type: "number" },
                              feedback: { type: "string" }
                            }
                          }
                        },
                        summary: { type: "string" },
                        tips: { type: "array", items: { type: "string" } },
                        bodyLanguage: {
                          type: "object",
                          nullable: true,
                          properties: {
                            eyeContact: { type: "number" },
                            engagement: { type: "number" },
                            attention: { type: "number" },
                            stability: { type: "number" },
                            expression: { type: "string" },
                            expressionConfidence: { type: "number" },
                            dominantExpression: { type: "string" },
                            sampleCount: { type: "number" }
                          }
                        },
                        setup: {
                          type: "object",
                          nullable: true,
                          properties: {
                            desiredRole: { type: "string" },
                            experienceLevel: { type: "string" },
                            industry: { type: "string" },
                            educationLevel: { type: "string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          400: {
            description: "Invalid interview ID format",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string", example: "Invalid interview ID format" }
                  }
                }
              }
            },
            404: {
              description: "Interview not found, not completed, or access denied",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: false },
                      message: { type: "string", example: "Interview not found, not completed, or access denied" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },

    // -------------------------
    // DASHBOARD ROUTES
    // -------------------------
    "/api/dashboard/summary": {
      get: {
        tags: ["Dashboard"],
        security: [{ bearerAuth: [] }],
        summary: "Get dashboard summary",
        responses: {
          200: {
            description: "Dashboard summary returned",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    summary: {
                      type: "object",
                      properties: {
                        interviewsCompleted: { type: "number" },
                        averagePercentage: { type: "number" },
                        improvement: { type: "number" },
                        lastInterviewSummary: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },

    "/api/dashboard/tips": {
      get: {
        tags: ["Dashboard"],
        security: [{ bearerAuth: [] }],
        summary: "Get AI interview improvement tips",
        responses: {
          200: {
            description: "AI tips returned",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    tips: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          tip: { type: "string", example: "Improve problem-solving skills by practicing algorithmic thinking" },
                          example: { type: "string", example: "Solve 2 coding problems daily on LeetCode focusing on arrays and strings" },
                          resources: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                type: { type: "string", enum: ["book", "website", "course", "article"], example: "book" },
                                name: { type: "string", example: "Cracking the Coding Interview" },
                                link: { type: "string", example: "https://www.amazon.com/dp/0984782850" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
