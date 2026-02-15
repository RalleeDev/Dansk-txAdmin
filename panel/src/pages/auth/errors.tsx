import InlineCode from "@/components/InlineCode";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { ApiOauthCallbackErrorResp } from "@shared/authApiTypes";
import { ArrowLeftIcon } from "lucide-react";
import { Link } from "wouter";


//Shortcut component
function ErrorText({ children }: { children: React.ReactNode }) {
    return (
        <p className="whitespace-pre-wrap text-secondary-foreground leading-relaxed pb-2">
            {children}
        </p>
    );
};

export type AuthErrorData = ApiOauthCallbackErrorResp & { returnTo?: string };
type AuthErrorProps = {
    error: AuthErrorData;
};


/**
 * Display OAuth errors in a user-friendly way.
 */
export function AuthError({ error }: AuthErrorProps) {
    error.returnTo = error.returnTo ?? '/login';
    let titleNode: React.ReactNode = null;
    let bodyNode: React.ReactNode = null;
    if ('errorTitle' in error) {
        titleNode = error.errorTitle
        bodyNode = <ErrorText>{error.errorMessage}</ErrorText>;
    } else if (error.errorCode === 'invalid_session') {
        titleNode = 'Ugyldig Browser Session.';
        bodyNode = <ErrorText>
            Du har måske genstartet txAdmin lige før du indlæste denne side. <br />
            Returnér venligst og prøv igen.
        </ErrorText>
    } else if (error.errorCode === 'clock_desync') {
        titleNode = 'Opdater/Synkronisere venligst dit ur.';
        bodyNode = <ErrorText>
            Login fejlede fordi host-maskinens ur er forkert. Synkronisere venligst dit ur med internettet.
        </ErrorText>
    } else if (error.errorCode === 'timeout') {
        titleNode = 'Forbindelsen til FiveMs servere løb ud.';
        bodyNode = <ErrorText>
            Prøv venligst igen eller login ved hjælp af dit eksisterende brugernavn og backup kodeord.
        </ErrorText>
    } else if (error.errorCode === 'end_user_aborted') {
        titleNode = 'Login Afbrudt';
        bodyNode = <ErrorText>
            Cfx.re login processen var afbrudt. <br />
            Returnér til login siden og prøv igen.
        </ErrorText>
    } else if (error.errorCode === 'end_user_logout') {
        titleNode = 'Login Aborted';
        bodyNode = <ErrorText>
            Cfx.re login processen var afbrudt fordi du afmeldte din Cfx.re konto. <br />
            Returnér til login siden og prøv igen.
        </ErrorText>
    } else if (error.errorCode === 'master_already_set') {
        titleNode = 'Master Konto alleredet sat op';
        bodyNode = <ErrorText>
            Gå venligst tilbage til login siden og log in. <br />
        </ErrorText>
    } else if (error.errorCode === 'not_admin') {
        const fivemId = error.errorContext?.identifier ?? 'Ukendt';
        const fivemName = error.errorContext?.name ?? 'Ukendt';
        titleNode = `Cfx.re kontoen '${fivemName}' er ikke en admin.`;
        bodyNode = <ErrorText>
            Kontoen ovenover med idenfikatoren <InlineCode>{fivemId}</InlineCode> er ikke tildelt nogen konto, der er registreret på txAdmin. <br />
            Du kan også prøve at logge ind med dit brugernavn og backup kodeord.
        </ErrorText>
    } else {
        titleNode = 'Ukendt Fejl:';
        bodyNode = <div className="text-left rounded-sm text-muted-foreground bg-muted p-1">
            <pre className="text-left whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</pre>
        </div>
    }

    return (
        <div className="p-4">
            <h3 className="text-2xl font-bold text-destructive-inline mb-4">
                {titleNode}
            </h3>
            {bodyNode}
            <CardFooter className="w-full flex justify-center mt-4 pb-0">
                <Link href={error.returnTo} asChild>
                    <Button className="x">
                        <ArrowLeftIcon className="inline mr-2 h-4 w-4" />
                        Prøv igen
                    </Button>
                </Link>
            </CardFooter>
        </div>
    )
}


/**
 * Check the URL search params for common OAuth errors and return them.
 */
export const checkCommonOauthErrors = () => {
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('error');
    const errorDescription = params.get('error_description');
    if (errorCode === 'access_denied' && errorDescription === 'End-User aborted interaction') {
        return { errorCode: 'end_user_aborted' };
    } else if (errorCode === 'access_denied' && errorDescription === 'End-User aborted interaction (logout)') {
        return { errorCode: 'end_user_logout' };
    }
}


/**
 * Process fetch errors and return a common error object.
 */
export const processFetchError = (error: any) => {
    if (error.message?.startsWith('NetworkError')) {
        return {
            errorTitle: 'Netværks fejl',
            errorMessage: 'Hvis du lukkede txAdmin, Genstart det venligst og prøv igen.',
        };
    } else {
        return {
            errorTitle: 'Ukendt fejl',
            errorMessage: error.message ?? '😵',
        };
    }
}
